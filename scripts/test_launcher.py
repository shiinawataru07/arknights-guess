"""Exercise the Windows launcher without installing packages or opening a browser."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


@unittest.skipUnless(os.name == "nt", "Windows batch launcher")
class LauncherTests(unittest.TestCase):
    def run_launcher(self, *, installed=False, missing_node=False, install_fails=False):
        with tempfile.TemporaryDirectory(prefix="arknights-launcher-", dir=Path(__file__).resolve().parents[1]) as temporary:
            root = Path(temporary)
            project = root / "中文 game folder"
            project.mkdir()
            launcher = project / "launcher.bat"
            shutil.copyfile(Path(__file__).resolve().parents[1] / "启动游戏.bat", launcher)
            binaries = root / "bin"
            binaries.mkdir()
            if not missing_node:
                (binaries / "node.CMD").write_text("@exit /b 0\n", encoding="ascii")
            (binaries / "npm.CMD").write_text(
                '@echo off\necho %*>>"%LAUNCHER_TEST_LOG%"\n'
                'if not exist launcher.bat exit /b 91\n'
                + ('if "%1"=="install" exit /b 42\n' if install_fails else '')
                + 'exit /b 0\n',
                encoding="ascii",
            )
            if installed:
                (project / "node_modules/vite/bin").mkdir(parents=True)
                (project / "node_modules/.package-lock.json").touch()
                (project / "node_modules/vite/bin/vite.js").touch()
            log = root / "calls.txt"
            system32 = Path(os.environ["SystemRoot"]) / "System32"
            environment = {
                **os.environ,
                "PATH": f"{binaries};{system32}",
                "LAUNCHER_TEST_LOG": str(log),
            }
            result = subprocess.run(
                f'"{system32 / "cmd.exe"}" /d /c call "{launcher}"',
                cwd=root,
                env=environment,
                input=b"\n",
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=15,
            )
            calls = log.read_text().splitlines() if log.exists() else []
            return result.returncode, calls, result.stdout

    def test_first_launch_installs_then_opens(self):
        code, calls, output = self.run_launcher()
        self.assertEqual(code, 0, output)
        self.assertEqual(calls, ["install", "run dev -- --host 127.0.0.1 --open"])

    def test_later_launch_skips_install(self):
        code, calls, output = self.run_launcher(installed=True)
        self.assertEqual(code, 0, output)
        self.assertEqual(calls, ["run dev -- --host 127.0.0.1 --open"])

    def test_missing_node_stops(self):
        code, calls, output = self.run_launcher(missing_node=True)
        self.assertEqual(code, 1, output)
        self.assertEqual(calls, [])
        self.assertIn(b"Node.js or npm was not found", output)

    def test_install_failure_does_not_start(self):
        code, calls, output = self.run_launcher(install_fails=True)
        self.assertEqual(code, 1, output)
        self.assertEqual(calls, ["install"])


if __name__ == "__main__":
    unittest.main()
