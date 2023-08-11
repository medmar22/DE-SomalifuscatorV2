import os
import sys
import time

from util.supporting.settings import all_

from util.ui.ui import Ui, UiLinux
from util.obfuscation.obfuscate import Obfuscator

from util.auto_updating.updater import AutoUpdate

from rich import print
from rich.panel import Panel
from rich.align import Align
from rich.syntax import Syntax
from rich.traceback import install

install()

from argparse import ArgumentParser


__version__ = "2.1.1"


class Main:
    def main(self):
        super_obf = all_.super_obf
        if any([args.file]):
            Obfuscator(args.file, double_click_check=False, utf_16_bom=False)
            return

        AutoUpdate(__version__)

        # initialize UI
        if os.name == "nt":
            self.ui = Ui()
        else:
            self.ui = UiLinux()

        # show main ui
        self.ui.main_ui()

        # hot asf settingsz
        Ui.pretty_print_settings()

        # get file location
        self.file_location = self.ui.get_user_file()

        # show inside of file (aesthetic trust)
        with open(self.file_location, encoding="utf8", errors="ignore") as f:
            syntax = Syntax(f.read(), "bat", line_numbers=True)
        print(Align.center(Panel.fit(syntax, title="Batch Content", border_style="bold blue", padding=(1, 2), subtitle=f"SomalifuscatorV{__version__}")))
        if super_obf:
            print("This is only available in the paid version of Somalifuscator.")
            input("Press any key to exit...")
        else:
            Obfuscator(self.file_location, double_click_check=all_.double_click_check, utf_16_bom=all_.utf_16_bom)
            input("Press any key to exit...")

        return


if __name__ == "__main__":
    parse = ArgumentParser()
    parse.add_argument("-f", "--file", help="File to obfuscate", type=str)
    args = parse.parse_args()
    current_time = time.time()
    Main().main()
    finish_time = time.time()
    print(f"It only took {finish_time - current_time} to finish!")
    sys.exit(0)
