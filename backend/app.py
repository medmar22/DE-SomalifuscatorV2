import os
import sys
import subprocess
import tempfile
import shutil
import logging
from pathlib import Path
# from urllib.parse import urlparse # Not needed
from flask import Flask, request, jsonify
from flask_cors import CORS # Make sure Flask-CORS is imported
from dotenv import load_dotenv
from supabase import create_client, Client

# --- Configuration ---
load_dotenv() # Load variables from .env file

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# --- Specific CORS Configuration ---
# Reverting from the wide-open debugging setting ('*') to specific origins.
# Add the specific Codespace frontend origin identified from browser errors.
frontend_origin_codespace = "https://vigilant-space-tribble-x6pv56g59462vv4r-5173.app.github.dev" # From error message
allowed_origins = [
    "http://localhost:5173",       # Standard local development
    "http://127.0.0.1:5173",      # Alternative localhost
    frontend_origin_codespace      # Specific Codespaces frontend origin
]
logging.info(f"Configuring CORS for specific origins: {allowed_origins}")
# Apply CORS rules specifically to routes starting with /api/
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
# --- End CORS Configuration ---


# --- Constants & Paths ---
BACKEND_DIR = Path(__file__).parent.resolve()
DEOBFUSCATOR_SCRIPT_PATH = BACKEND_DIR / "deobfuscator.py"
SOMALIFUSCATOR_DIR = BACKEND_DIR / "OG CODE" # Using the specified folder name
SOMALIFUSCATOR_SRC_DIR = SOMALIFUSCATOR_DIR / "src"

# Check if scripts/structure exist
deobfuscator_ok = DEOBFUSCATOR_SCRIPT_PATH.is_file()
somalifuscator_ok = (SOMALIFUSCATOR_DIR.is_dir() and
                     SOMALIFUSCATOR_SRC_DIR.is_dir() and
                     (SOMALIFUSCATOR_SRC_DIR / "main.py").is_file())

if not deobfuscator_ok:
    logging.error(f"FATAL: Deobfuscator script not found: {DEOBFUSCATOR_SCRIPT_PATH}")
if not somalifuscator_ok:
     logging.warning(f"Warning: Original Somalifuscator structure ('OG CODE/src/main.py') not found. Obfuscation endpoint will fail.")

# --- Dependency Check Reminder ---
# Check if requirements for Somalifuscator exist and remind user
somalifuscator_reqs = SOMALIFUSCATOR_DIR / "requirements.txt"
if somalifuscator_ok and somalifuscator_reqs.is_file():
    logging.info(f"Found Somalifuscator requirements at {somalifuscator_reqs}. Ensure they are installed in your Python environment (pip install -r \"{somalifuscator_reqs}\")")
elif somalifuscator_ok:
     logging.warning(f"Could not find requirements.txt in {SOMALIFUSCATOR_DIR}. Ensure Somalifuscator dependencies are installed manually.")

ALLOWED_EXTENSIONS = {'.bat', '.cmd'}

# --- Supabase Setup ---
SUPABASE_URL: str | None = os.environ.get("SUPABASE_URL")
# Use SERVICE_KEY for backend operations for better security control if needed later
SUPABASE_KEY: str | None = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        key_type = 'Service Key' if os.environ.get('SUPABASE_SERVICE_KEY') else 'Anon Key'
        logging.info(f"Supabase client initialized successfully ({key_type}). URL: {SUPABASE_URL}")
    except Exception as e:
        supabase = None
        logging.error(f"Failed to initialize Supabase client: {e}")
else:
    logging.warning("Supabase URL or Key not found in environment variables. Supabase integration disabled.")

# Helper function to check file extension
def allowed_file(filename):
    if not filename: return False
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

# Function to run subprocess and handle logging/errors
def run_script(cmd: list, cwd: Path | None = None, script_name: str = "Script") -> tuple[bool, str | None, str | None]:
    """Runs a script command, returns (success, stdout, stderr_or_combined_output_on_error)."""
    logging.info(f"Running {script_name}...")
    logging.info(f"  Command: {' '.join(map(str, cmd))}") # Ensure all parts are strings for join
    logging.info(f"  Work Dir: {cwd or 'Default'}")
    try:
        # It's often better to capture stderr separately
        process = subprocess.run(
            cmd,
            capture_output=True, # Capture both stdout and stderr
            text=True,
            check=False, # Check returncode manually
            encoding='utf-8',
            errors='replace',
            cwd=str(cwd) if cwd else None # Ensure cwd is a string
        )

        # Log detailed output regardless of success/failure for debugging
        log_output = f"Return Code: {process.returncode}\n{script_name} Stdout:\n{process.stdout}\n{script_name} Stderr:\n{process.stderr}"

        if process.returncode == 0:
            logging.info(f"{script_name} completed successfully.\n{log_output}")
            return True, process.stdout, process.stderr # Return actual stderr
        else:
            logging.error(f"{script_name} failed.\n{log_output}")
            # Combine stderr and stdout for the error message if stderr is empty or less informative
            error_details = process.stderr if process.stderr.strip() else process.stdout
            return False, process.stdout, error_details # Return combined/stderr details

    except FileNotFoundError as e:
         logging.error(f"Error running {script_name}: File not found (Command: {' '.join(map(str, cmd))}). {e}")
         return False, None, f"File not found error: {e}. Ensure Python and the script exist and are in the PATH or specified correctly."
    except Exception as e:
        logging.exception(f"An unexpected error occurred while running {script_name}") # Logs full traceback
        return False, None, f"Unexpected error during script execution: {str(e)}"

# --- API Routes ---

@app.route('/api/deobfuscate', methods=['POST'])
def handle_deobfuscate():
    # --- ADDED LOGGING ---
    logging.info(f"!!! Request received for /api/deobfuscate from {request.remote_addr} !!!")
    logging.info(f"Origin Header: {request.headers.get('Origin')}") # Log the actual origin header received
    # --- END ADDED LOGGING ---

    # --- Input Validation ---
    if not deobfuscator_ok: # Check if script exists early
         return jsonify({"success": False, "error": "Internal server error: Deobfuscator script not configured."}), 500
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part in the request"}), 400
    file = request.files['file']
    if not file or not file.filename or not allowed_file(file.filename):
        return jsonify({"success": False, "error": "No valid file selected (.bat or .cmd required)"}), 400

    # --- Processing ---
    temp_dir = None
    try:
        # Create a temporary directory for processing
        temp_dir = tempfile.mkdtemp(prefix="deobf_")
        logging.info(f"Created temporary directory: {temp_dir}")
        temp_dir_path = Path(temp_dir)
        in_suffix = Path(file.filename).suffix
        # Use safe filenames within the temp directory
        temp_input_path = temp_dir_path / f"input_file{in_suffix}"
        temp_output_path = temp_dir_path / f"output_file{in_suffix}"

        file.save(temp_input_path)
        logging.info(f"Saved uploaded file to: {temp_input_path}")

        # Command to run your deobfuscator.py
        cmd = [
            sys.executable, # Use the same python interpreter running Flask
            str(DEOBFUSCATOR_SCRIPT_PATH),
            str(temp_input_path),
            "-o", str(temp_output_path)
            # Optional: add "-v" if you want verbose output logged by the backend
            # "-v"
        ]
        success, _, script_error_output = run_script(cmd, script_name="Deobfuscator")

        if not success:
            err_msg = f"Deobfuscation script failed."
            if script_error_output: err_msg += f" Details: {script_error_output[:500]}" # Limit error length
            logging.error(err_msg) # Log the failure details
            return jsonify({"success": False, "error": err_msg}), 500

        # Verify output file exists
        if not temp_output_path.is_file() or temp_output_path.stat().st_size == 0:
            err_msg = "Internal server error: Deobfuscation produced no output or empty file."
            if script_error_output: err_msg += f" Script stderr: {script_error_output[:500]}"
            logging.error(err_msg)
            return jsonify({"success": False, "error": err_msg}), 500

        processed_code = temp_output_path.read_text(encoding='utf-8', errors='replace')
        logging.info(f"Successfully read deobfuscated output file ({len(processed_code)} chars).")

        # --- Optional Supabase Logging ---
        # (Keep this commented out unless you implement Supabase logic)
        # if supabase:
        #     try:
        #         pass # Replace with your actual Supabase logic
        #     except Exception as sb_error:
        #         logging.error(f"Supabase interaction failed during deobfuscate log: {sb_error}")

        return jsonify({"success": True, "processedCode": processed_code})

    except Exception as e:
        logging.exception("An unexpected error occurred during deobfuscation handling")
        return jsonify({"success": False, "error": f"An unexpected internal server error occurred: {str(e)}"}), 500
    finally:
        # Clean up the temporary directory
        if temp_dir and Path(temp_dir).exists():
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                 logging.error(f"Failed to remove temporary directory {temp_dir}: {e}")


@app.route('/api/obfuscate', methods=['POST'])
def handle_obfuscate():
    # --- ADDED LOGGING ---
    logging.info(f"!!! Request received for /api/obfuscate from {request.remote_addr} !!!")
    logging.info(f"Origin Header: {request.headers.get('Origin')}") # Log the actual origin header received
    # --- END ADDED LOGGING ---

    # --- Input Validation ---
    if not somalifuscator_ok: # Check if script structure is okay early
         return jsonify({"success": False, "error": "Internal server error: Original obfuscator script not configured or found."}), 500
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part in the request"}), 400
    file = request.files['file']
    if not file or not file.filename or not allowed_file(file.filename):
        return jsonify({"success": False, "error": "No valid file selected (.bat or .cmd required)"}), 400

    # --- Processing ---
    temp_dir = None
    try:
        temp_dir = tempfile.mkdtemp(prefix="obf_")
        logging.info(f"Created temporary directory: {temp_dir}")
        temp_dir_path = Path(temp_dir)
        in_suffix = Path(file.filename).suffix
        temp_input_path = temp_dir_path / f"input_file{in_suffix}"
        temp_output_path = temp_dir_path / f"output_file{in_suffix}"

        file.save(temp_input_path)
        logging.info(f"Saved uploaded file to: {temp_input_path}")

        # --- Construct Command Confirmed by OG CODE/src/main.py ---
        cmd = [
            sys.executable,
            "-m", "main",                      # Run src/main.py as a module
            "-f", str(temp_input_path),        # Input file flag
            "-o", str(temp_output_path)        # Output file flag
        ]

        # --- Execute from within OG CODE/src directory ---
        success, _, script_error_output = run_script(cmd, cwd=SOMALIFUSCATOR_SRC_DIR, script_name="Somalifuscator")

        if not success:
            err_msg = f"Obfuscation script failed."
            if script_error_output: err_msg += f" Details: {script_error_output[:500]}"
            if script_error_output and ("ModuleNotFoundError" in script_error_output or "ImportError" in script_error_output):
                 err_msg += f" (Potential dependency issue. Ensure requirements installed: pip install -r \"{SOMALIFUSCATOR_DIR.resolve() / 'requirements.txt'}\")"
            logging.error(err_msg)
            return jsonify({"success": False, "error": err_msg}), 500

        # --- Verify Output ---
        if not temp_output_path.is_file() or temp_output_path.stat().st_size == 0:
            err_msg = "Internal server error: Obfuscation produced no output or empty file."
            if script_error_output: err_msg += f" Script stderr: {script_error_output[:500]}"
            logging.error(err_msg)
            return jsonify({"success": False, "error": err_msg}), 500

        processed_code = temp_output_path.read_text(encoding='utf-8', errors='replace')
        logging.info(f"Successfully read obfuscated output file ({len(processed_code)} chars).")

        # --- Optional Supabase Logging ---
        # (Keep this commented out unless you implement Supabase logic)
        # if supabase:
        #     try:
        #         pass # Replace with your actual Supabase logic
        #     except Exception as sb_error:
        #         logging.error(f"Supabase interaction failed during obfuscate log: {sb_error}")

        return jsonify({"success": True, "processedCode": processed_code})

    except Exception as e:
        logging.exception("An unexpected error occurred during obfuscation handling")
        return jsonify({"success": False, "error": f"An unexpected internal server error occurred: {str(e)}"}), 500
    finally:
        # Clean up the temporary directory
        if temp_dir and Path(temp_dir).exists():
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                 logging.error(f"Failed to remove temporary directory {temp_dir}: {e}")


# --- Main Execution ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    debug_mode = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    logging.info(f"Starting Flask server on http://0.0.0.0:{port}/ with debug_mode={debug_mode}")
    app.run(debug=debug_mode, host='0.0.0.0', port=port)