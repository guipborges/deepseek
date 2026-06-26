import os
import zipfile
from pathlib import Path


def main():
    """
    Packages the browser extension into a zip file for distribution.
    """
    # --- Configuration ---
    # Paths are resolved from project root, not from current working directory.
    project_root = Path(__file__).resolve().parent.parent
    include_paths = [
        "manifest.json",
        "src",
        "assets",
    ]
    output_dir = project_root / "dist"
    output_filename = "ayvu-translator-extension.zip"
    output_path = output_dir / output_filename
    # --- End Configuration ---

    output_dir.mkdir(parents=True, exist_ok=True)

    if output_path.exists():
        print(f"Removendo zip antigo: {output_path}")
        output_path.unlink()

    print(f"Criando arquivo zip: {output_path}")

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for relative_path in include_paths:
            path = project_root / relative_path
            if not path.exists():
                print(f"Aviso: O caminho '{path}' não foi encontrado e será ignorado.")
                continue

            if path.is_dir():
                for root, _, files in os.walk(path):
                    for file in files:
                        file_path = Path(root) / file
                        if file_path.suffix == ".pyc" or "__pycache__" in file_path.parts:
                            continue
                        archive_path = file_path.relative_to(project_root).as_posix()
                        zf.write(file_path, archive_path)
            else:
                archive_path = path.relative_to(project_root).as_posix()
                zf.write(path, archive_path)

    print(f"\nExtensão empacotada com sucesso em '{output_path}'!")
    print("Você pode usar este arquivo para carregar a extensão no Chrome ou publicá-la na Web Store.")

if __name__ == "__main__":
    main()