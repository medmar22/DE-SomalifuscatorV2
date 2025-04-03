import re
import os
import argparse
import string
import math # For potential eval context
from pathlib import Path
from typing import List, Dict, Optional, Any, Union

# --- Constants and Known Patterns ---

VERBOSE = False

# Environment variables used by ran2 and obf_oneline.obfuscate_normal
ENV_VAR_VALUES = {
    "PUBLIC": r"C:\Users\Public",
    "COMMONPROGRAMFILES(X86)": r"C:\Program Files (x86)\Common Files",
    "PROGRAMFILES": r"C:\Program Files",
    "PROGRAMFILES(X86)": r"C:\Program Files (x86)",
    "DRIVERDATA": r"C:\Windows\System32\Drivers\DriverData",
    "COMMONPROGRAMFILES": r"C:\Program Files\Common Files",
    "COMMONPROGRAMW6432": r"C:\Program Files\Common Files",
    "USERPROFILE": os.environ.get("USERPROFILE", "C:\\Users\\Default"),
    "TEMP": os.environ.get("TEMP", "C:\\Users\\Default\\AppData\\Local\\Temp"),
    "TMP": os.environ.get("TMP", "C:\\Users\\Default\\AppData\\Local\\Temp"),
    "LOCALAPPDATA": os.environ.get("LOCALAPPDATA", "C:\\Users\\Default\\AppData\\Local"),
    "APPDATA": os.environ.get("APPDATA", "C:\\Users\\Default\\AppData\\Roaming"),
    "OS": "Windows_NT",
    "SYSTEMDRIVE": os.environ.get("SYSTEMDRIVE", "C:"),
    "SESSIONNAME": "Console", # Added by obfuscator if double_click_check=True
    # Add others if found necessary
}

# Regex to find the KDOT variable assignment
RE_KDOT = re.compile(r"^\s*set\s+KDOT=([a-zA-Z0-9]+)", re.IGNORECASE)

# Regex to find Caesar cipher definitions (assuming single letters)
RE_CAESAR_DEF = re.compile(r"^\s*set\s+([a-z])=([a-z])", re.IGNORECASE)

# Regex for character obfuscation patterns
# 1. Environment Variable Slicing (Handles random spaces before '1')
RE_ENV_SLICE = re.compile(r"%(\w+):~(-?\d+),(?:\s*)1%", re.IGNORECASE)
# 2. KDOT Slicing (Handles random spaces before '1')
RE_KDOT_SLICE = re.compile(r"%KDOT:~(-?\d+),(?:\s*)1%", re.IGNORECASE)
# 3. Caesar Cipher + Optional Junk Variable
RE_CAESAR_JUNK = re.compile(r"%([a-z])(1?)%(?:%[a-zA-Z0-9]+%)?", re.IGNORECASE)
# 4. Simple Junk Wrapping (Applied last)
RE_SIMPLE_JUNK = re.compile(r"%[a-zA-Z0-9]+%(.)%[a-zA-Z0-9]+%")
# Combined regex for first pass of character deobfuscation
RE_COMBINED_SPECIFIC_CHAR_OBF = re.compile(
    f"({RE_ENV_SLICE.pattern})|({RE_KDOT_SLICE.pattern})|({RE_CAESAR_JUNK.pattern})",
     re.IGNORECASE
)

# --- Scrambler Related Regex ---
# Regex for Scrambler jump setup block in main code (captures math expression)
RE_SCRAMBLE_JUMP = re.compile(
    # Matches "set /a ans = MATH_EXPRESSION"
    r"^\s*set\s+/a\s+ans\s*=\s*(.*?)\s*\n"
    # Matches "goto %ans%" (case-insensitive)
    r"\s*goto\s+%ans%\s*\n"
     # Matches the return label ":NUMBER"
    r"\s*:(\d+)\s*$",
    re.IGNORECASE | re.MULTILINE
)

# Regex for parsing scrambled blocks at the end
RE_SCRAMBLED_BLOCK = re.compile(
    # Matches the target label ":NUMBER"
    r"^:(\d+)\s*\n"
    # Non-greedily capture everything until the return logic starts.
    # This group (2) contains the original code plus potentially injected anti-methods.
    r"([\s\S]*?)\n"
    # Matches the return logic: set /a ans = ..., goto %ans%
    # We don't need to capture this part, just ensure it exists.
    r"\s*set\s+/a\s+ans=[\s\S]*?\n"
    r"\s*goto\s+%ans%\s*$",
    re.IGNORECASE | re.MULTILINE
)


# Regex for lines to remove entirely
RE_LINES_TO_REMOVE = [
    re.compile(r"^\s*::Made by K\.Dot using SomalifuscatorV2", re.IGNORECASE),
    re.compile(r"^\s*chcp 65001 > nul", re.IGNORECASE),
    re.compile(r"^\s*set\s+[a-z]=[a-z]", re.IGNORECASE), # Caesar defs
    re.compile(r"^\s*>nul 2>&1 && exit >nul 2>&1 \|\| cls", re.IGNORECASE), # Initial check line
    # Add patterns for AntiChanges, DeadCode etc. if they become known or identifiable
    re.compile(r"^\s*rem ANTICHANGES MARKER", re.IGNORECASE), # Example placeholder
    re.compile(r"^\s*rem DEADCODE MARKER", re.IGNORECASE), # Example placeholder
    re.compile(r"^\s*(goto\s+:eof|exit\s*/b\s*0)\s*$", re.IGNORECASE), # Remove scrambler's goto EOF
]

# --- Helper Functions ---

def log_verbose(*args):
    """Prints only if VERBOSE flag is set."""
    if VERBOSE:
        print("VERBOSE:", *args)

def safe_eval_batch_math(expression: str) -> Optional[int]:
    """
    Attempts to safely evaluate a batch 'set /a' math expression.
    Handles basic arithmetic and common bitwise operators. Limited safety.
    """
    # Sanitize: Allow numbers, basic operators, parentheses, common bitwise ops
    # Remove spaces for easier parsing/eval
    expression = expression.replace(" ", "")
    
    # Basic validation: Check for potentially harmful characters/keywords
    # This is NOT foolproof security, just a basic guardrail.
    allowed_chars = set("0123456789+-*/%()&|^<>") 
    if not all(c in allowed_chars for c in expression):
         print(f"Warning: Potentially unsafe characters found in math expression: '{expression}'. Skipping evaluation.")
         return None

    # Replace Batch bitwise operators with Python equivalents if possible
    # Note: Batch precedence might differ from Python's!
    # This is a simplification and might be incorrect for complex cases.
    py_expr = expression.replace('^', '**') # Example: Treat ^ as exponentiation (common mistake)
                                            # Actual Batch ^ is XOR. Add specific handling if needed.
    # Python uses <<, >>, &, |, ^ for bitwise directly.

    try:
        # Use a limited context for eval
        result = eval(py_expr, {"__builtins__": None}, {'math': math}) # Provide math module if needed
        return int(result)
    except (SyntaxError, TypeError, NameError, ValueError, OverflowError, Exception) as e:
        print(f"Warning: Could not evaluate math expression '{expression}' (Python: '{py_expr}'): {e}. Manual analysis needed.")
        return None

# --- Deobfuscation Core Functions ---

def read_and_preprocess(file_path: Path) -> Optional[List[str]]:
    """Reads the file, handles BOM and encoding."""
    # (Implementation mostly unchanged from previous version)
    try:
        content_bytes = file_path.read_bytes()
    except IOError as e:
        print(f"Error reading file {file_path}: {e}")
        return None

    if content_bytes.startswith(b'\xff\xfe'):
        log_verbose("Detected UTF-16 LE BOM.")
        enc = 'utf-16le'
        content_bytes = content_bytes[2:]
    else:
        # Try UTF-8 first, then fallback (assuming cp1252 is common)
        try:
            content_bytes.decode('utf-8', errors='strict')
            enc = 'utf-8'
            log_verbose("Detected UTF-8 encoding.")
        except UnicodeDecodeError:
            enc = 'cp1252' # Or locale.getpreferredencoding()
            log_verbose(f"UTF-8 decode failed, trying fallback: {enc}")
        except Exception as e:
            print(f"Error detecting encoding: {e}")
            return None

    try:
        content = content_bytes.decode(enc, errors='ignore')
        lines = content.splitlines()
        print(f"Read {len(lines)} lines using {enc} encoding.")
        return lines
    except Exception as e:
        print(f"Error decoding file content with {enc}: {e}")
        return None


def extract_initial_settings(lines: List[str]) -> Dict:
    """Finds KDOT value and builds the reverse Caesar map."""
    # (Implementation mostly unchanged, added verbose logging)
    settings = {"kdot_value": None, "reverse_caesar_map": {}}

    for i, line in enumerate(lines):
        if settings["kdot_value"] is None:
            kdot_match = RE_KDOT.match(line)
            if kdot_match:
                settings["kdot_value"] = kdot_match.group(1)
                log_verbose(f"Found KDOT value at line {i+1}: {settings['kdot_value']}")

        caesar_match = RE_CAESAR_DEF.match(line)
        if caesar_match:
            original_char = caesar_match.group(1).lower()
            obfuscated_char = caesar_match.group(2).lower()
            if obfuscated_char in settings["reverse_caesar_map"] and \
               settings["reverse_caesar_map"][obfuscated_char] != original_char:
                 print(f"Warning: Conflicting Caesar definition for '{obfuscated_char}' at line {i+1}. Keeping previous.")
            elif obfuscated_char not in settings["reverse_caesar_map"]:
                settings["reverse_caesar_map"][obfuscated_char] = original_char
                log_verbose(f"Found Caesar mapping at line {i+1}: {obfuscated_char} -> {original_char}")

    if not settings["kdot_value"]:
        print("Warning: KDOT variable definition not found.")
    if not settings["reverse_caesar_map"]:
        print("Warning: Caesar cipher definitions not found.")
    else:
        print(f"Built reverse Caesar map with {len(settings['reverse_caesar_map'])} entries.")

    return settings

# --- Character Deobfuscation Helpers ---
# (get_char_from_env_slice, get_char_from_kdot, get_char_from_caesar unchanged)
def get_char_from_env_slice(match: re.Match) -> str:
    """Helper to resolve environment variable slicing."""
    var_name = match.group(1).upper()
    try:
        index = int(match.group(2))
    except ValueError: return match.group(0)

    if var_name in ENV_VAR_VALUES:
        value = ENV_VAR_VALUES[var_name]
        try:
            actual_index = len(value) + index if index < 0 else index
            if 0 <= actual_index < len(value): return value[actual_index]
            else: print(f"Warning: Index {index} out of bounds for {var_name} ('{value}')"); return ""
        except IndexError: print(f"Warning: IndexError for {var_name}:~{index},1"); return ""
    else: print(f"Warning: Unknown environment variable '{var_name}' in slice: {match.group(0)}"); return match.group(0)

def get_char_from_kdot(match: re.Match, kdot_value: Optional[str]) -> str:
    """Helper to resolve KDOT variable slicing."""
    if not kdot_value: print("Warning: KDOT value unknown, cannot resolve KDOT slice."); return match.group(0)
    try:
        index = int(match.group(1))
        if 0 <= index < len(kdot_value): return kdot_value[index]
        else: print(f"Warning: KDOT index {index} out of bounds."); return ""
    except (ValueError, IndexError): print(f"Warning: Invalid KDOT slice: {match.group(0)}"); return match.group(0)

def get_char_from_caesar(match: re.Match, reverse_map: Dict) -> str:
    """Helper to resolve Caesar cipher characters."""
    obfuscated_char = match.group(1).lower(); is_upper_marker = match.group(2)
    if obfuscated_char in reverse_map:
        original_char = reverse_map[obfuscated_char]
        return original_char.upper() if is_upper_marker else original_char
    else: print(f"Warning: Character '{obfuscated_char}' not in reverse Caesar map."); return match.group(0)
# ---

def deobfuscate_line_characters(line: str, settings: Dict) -> str:
    """Applies character deobfuscation rules iteratively to a single line."""
    kdot_value = settings.get("kdot_value")
    reverse_caesar_map = settings.get("reverse_caesar_map", {})
    original_line = line

    # --- Pass 1: Specific Slices and Caesar ---
    def replace_callback(match):
        # Determine which sub-pattern matched by checking which capture groups are non-None
        # Group indices align with the order in RE_COMBINED_SPECIFIC_CHAR_OBF
        if match.group(2): # Matched RE_ENV_SLICE (group 1 is the whole slice, 2 is var_name, 3 is index)
            # Re-match the specific pattern to get named groups easily if needed, or use indices
            env_match = RE_ENV_SLICE.match(match.group(1))
            return get_char_from_env_slice(env_match) if env_match else match.group(0)
        elif match.group(5): # Matched RE_KDOT_SLICE (group 4 whole slice, 5 index)
            kdot_match = RE_KDOT_SLICE.match(match.group(4))
            return get_char_from_kdot(kdot_match, kdot_value) if kdot_match else match.group(0)
        elif match.group(7): # Matched RE_CAESAR_JUNK (group 6 whole, 7 char, 8 marker '1')
            caesar_match = RE_CAESAR_JUNK.match(match.group(6))
            return get_char_from_caesar(caesar_match, reverse_caesar_map) if caesar_match else match.group(0)
        else: # Should not happen
            return match.group(0)


    passes = 0
    max_passes = 15 # Increase slightly for potentially deeper nesting
    last_line = None
    processed_line = line
    while processed_line != last_line and passes < max_passes:
        last_line = processed_line
        processed_line = RE_COMBINED_SPECIFIC_CHAR_OBF.sub(replace_callback, last_line)
        passes += 1
        # log_verbose(f"  Pass {passes} specific: {processed_line[:80]}...") # Debugging

    if passes >= max_passes and processed_line != last_line:
        print(f"Warning: Max substitution passes ({max_passes}) reached for specific patterns on line: {original_line[:80]}...")

    # --- Pass 2: Simple Junk Removal ---
    passes = 0
    max_passes_junk = 5 # Usually less nesting here
    last_line = None
    while processed_line != last_line and passes < max_passes_junk:
        last_line = processed_line
        processed_line = RE_SIMPLE_JUNK.sub(r"\1", last_line) # Replace %junk%C%junk% with C
        passes += 1
        # log_verbose(f"  Pass {passes} junk: {processed_line[:80]}...") # Debugging

    if passes >= max_passes_junk and processed_line != last_line:
        print(f"Warning: Max substitution passes ({max_passes_junk}) reached for junk removal on line: {original_line[:80]}...")


    # --- Pass 3: Remove leftover markers ---
    processed_line = processed_line.replace("%escape%", "").replace("%STOP_OBF_HERE%", "")

    # --- Pass 4: Normalize command case (simple version) ---
    words = processed_line.split()
    if words:
        known_commands = ["echo", "set", "goto", "if", "for", "call", "exit", "chcp", "cls", "rem", "pause"]
        first_word_lower = words[0].lower()
        if first_word_lower.strip(':') in known_commands or first_word_lower in known_commands:
             words[0] = first_word_lower
        processed_line = " ".join(words)

    if VERBOSE and original_line != processed_line:
         log_verbose(f"Deobfuscated line: {processed_line[:80]}...")

    return processed_line


def reverse_scrambling(lines: List[str]) -> List[str]:
    """Reverses the Scrambler code reordering, evaluating math."""
    # Find the FIRST occurrence of a likely scrambler 'goto :EOF' or 'exit /b 0'
    # marker, as others might exist in the original user code.
    eof_index = -1
    for i, line in enumerate(lines):
        stripped_lower = line.strip().lower()
        if stripped_lower == "goto :eof" or stripped_lower == "exit /b 0":
            # Basic check: Is it likely preceded by scrambled code jump logic?
            if i > 0 and lines[i-1].strip().lower().startswith("goto %ans%"):
                 eof_index = i
                 break
            # If not preceded by jump, maybe it's user's own exit, keep searching.

    if eof_index == -1:
        print("Scrambler 'goto :EOF' marker likely not found or structure unexpected. Skipping scrambling reversal.")
        return lines

    print(f"Found potential scrambler 'goto :EOF' marker at line index {eof_index}.")
    main_code_lines = lines[:eof_index]
    scrambled_part_lines = lines[eof_index + 1:]
    scrambled_part_text = "\n".join(scrambled_part_lines)

    # Parse the scrambled blocks: {target_label_str: original_code_line}
    label_to_code: Dict[str, str] = {}
    parsed_block_count = 0
    failed_block_count = 0
    for match in RE_SCRAMBLED_BLOCK.finditer(scrambled_part_text):
        label = match.group(1)
        # Group 2 contains original code + potentially injected anti-methods.
        # Assume original code is the first non-empty line(s).
        potential_code_lines = match.group(2).strip().splitlines()
        original_code = ""
        if potential_code_lines:
            original_code = potential_code_lines[0].strip() # Take the first line
            # Could potentially join first few lines if original was multi-line, but less likely
        else:
            print(f"Warning: Found block for label {label} but no code captured.")
            failed_block_count += 1
            continue

        if label in label_to_code:
            print(f"Warning: Duplicate label {label} found in scrambled blocks. Overwriting.")
        label_to_code[label] = original_code
        log_verbose(f"Found scrambled block for label {label}: {original_code[:60]}...")
        parsed_block_count += 1

    if not label_to_code:
        print("No valid scrambled blocks found after 'goto :EOF'. Structure might be broken.")
        return main_code_lines # Return only the main code part

    print(f"Parsed {parsed_block_count} scrambled blocks (encountered {failed_block_count} errors).")

    # Reconstruct the main code by replacing jump blocks
    reconstructed_code = []
    main_code_text = "\n".join(main_code_lines)
    last_pos = 0
    replacement_count = 0
    failed_evaluation_count = 0

    for jump_match in RE_SCRAMBLE_JUMP.finditer(main_code_text):
        math_expression = jump_match.group(1)
        return_label = jump_match.group(2) # Return label from the jump block itself

        # Evaluate the math expression to find the target label
        target_label_int = safe_eval_batch_math(math_expression)
        target_label_str = str(target_label_int) if target_label_int is not None else None

        # Add the text before this jump block
        reconstructed_code.append(main_code_text[last_pos:jump_match.start()])

        # Replace the jump block with the original code from the map
        if target_label_str and target_label_str in label_to_code:
            log_verbose(f"Replacing jump (math='{math_expression}', eval={target_label_str}) with code for label {target_label_str}.")
            reconstructed_code.append(label_to_code[target_label_str])
            replacement_count += 1
        elif target_label_str:
            print(f"Warning: Evaluated jump target label {target_label_str} (from '{math_expression}'), but no corresponding block found!")
            failed_evaluation_count += 1
            # Option: Keep the original jump block? Or remove? Remove for cleaner output.
            # reconstructed_code.append(f"rem FAILED_JUMP_TARGET_NOT_FOUND: {target_label_str}")
        else:
            # Math evaluation failed
             print(f"Warning: Failed to evaluate math for jump target ('{math_expression}'). Cannot replace jump.")
             failed_evaluation_count += 1
             # reconstructed_code.append(f"rem FAILED_JUMP_MATH_EVAL: {math_expression}")


        last_pos = jump_match.end()

    # Add any remaining text after the last jump block
    reconstructed_code.append(main_code_text[last_pos:])

    print(f"Finished reversing scrambling: {replacement_count} jumps replaced, {failed_evaluation_count} failures.")
    return "\n".join(reconstructed_code).splitlines()


def remove_inserted_code(lines: List[str]) -> List[str]:
    """Removes known inserted lines using patterns in RE_LINES_TO_REMOVE."""
    original_count = len(lines)
    cleaned_lines = []
    removed_count = 0
    for i, line in enumerate(lines):
        is_removable = False
        for pattern in RE_LINES_TO_REMOVE:
            if pattern.match(line):
                log_verbose(f"Removing line {i+1} matching pattern: {pattern.pattern[:50]}...")
                is_removable = True
                removed_count +=1
                break
        if not is_removable:
            cleaned_lines.append(line)

    if removed_count > 0:
        print(f"Removed {removed_count} known inserted/junk lines.")
    return cleaned_lines

def final_cleanup(lines: List[str]) -> List[str]:
    """Basic cleanup: remove extra empty lines and leading/trailing whitespace."""
    cleaned = []
    last_line_empty = True
    for line in lines:
        stripped = line.strip()
        if stripped:
            cleaned.append(stripped) # Store stripped line
            last_line_empty = False
        elif not last_line_empty:
            # Keep one empty line for readability, but don't add if multiple were there
            cleaned.append("") # Add an actual empty string
            last_line_empty = True
    # Remove potential trailing empty line added by loop
    if cleaned and cleaned[-1] == "":
        cleaned.pop()
    return cleaned


# --- Main Execution ---

def deobfuscate_file(input_path: Path, output_path: Path):
    """Main deobfuscation pipeline."""
    print("-" * 60)
    print(f"Starting deobfuscation for: {input_path}")
    print("-" * 60)

    # 1. Read and Preprocess (Encoding, BOM)
    lines = read_and_preprocess(input_path)
    if lines is None: return

    # 2. Extract Initial Settings (KDOT, Caesar Map)
    print("\n[Step 1/5] Extracting initial settings...")
    settings = extract_initial_settings(lines)

    # 3. Deobfuscate Characters (Iteratively apply rules)
    print("\n[Step 2/5] Deobfuscating characters...")
    char_deobfuscated_lines = []
    for i, line in enumerate(lines):
         log_verbose(f"Processing line {i+1}/{len(lines)}: {line[:80]}...")
         processed_line = deobfuscate_line_characters(line, settings)
         char_deobfuscated_lines.append(processed_line)
    print("Character deobfuscation finished.")

    # 4. Reverse Scrambling (Requires character deobf to be done first)
    print("\n[Step 3/5] Reversing code scrambling...")
    scramble_reversed_lines = reverse_scrambling(char_deobfuscated_lines)

    # 5. Remove Inserted/Known Junk Lines
    print("\n[Step 4/5] Removing known inserted lines...")
    removed_junk_lines = remove_inserted_code(scramble_reversed_lines)

    # 6. Final Cleanup (Extra blank lines etc)
    print("\n[Step 5/5] Performing final cleanup...")
    final_lines = final_cleanup(removed_junk_lines)

    # 7. Write Output
    print("\nWriting output...")
    try:
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("\n".join(final_lines), encoding='utf-8', newline='\r\n') # Use CRLF for batch files
        print("-" * 60)
        print(f"Deobfuscation complete. Output written to: {output_path}")
        print("-" * 60)
    except IOError as e:
        print(f"Error writing output file {output_path}: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during file writing: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Deobfuscator for SomalifuscatorV2",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("input_file", help="Path to the obfuscated batch file.")
    parser.add_argument("-o", "--output", help="Path for the deobfuscated output file.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging.")

    args = parser.parse_args()

    VERBOSE = args.verbose # Set global verbose flag

    input_path = Path(args.input_file)
    if not input_path.is_file():
        print(f"Error: Input file not found: {input_path}")
        exit(1)

    if args.output:
        output_path = Path(args.output)
    else:
        # Place output in same dir as input by default
        output_path = input_path.with_name(f"{input_path.stem}_deobf.bat")

    # Basic check to prevent overwriting input file accidentally
    if input_path.resolve() == output_path.resolve():
         print(f"Error: Input and output file paths are the same ({input_path}). Choose a different output path.")
         exit(1)

    deobfuscate_file(input_path, output_path)