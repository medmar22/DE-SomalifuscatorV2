# Somalifuscator Toolbox UI - FLYBI

A user-friendly web interface built with Vite and React for interacting with the original SomalifuscatorV2 batch file obfuscator by KingKDot and a custom Python deobfuscator script. This UI allows users to easily obfuscate or deobfuscate `.bat` and `.cmd` files.

![image](https://i.postimg.cc/x17cyzSy/image.png)


## Features

*   **Upload:** Drag & drop or browse to upload `.bat` or `.cmd` files.
*   **Obfuscate:** Process the uploaded file using the original [SomalifuscatorV2](https://github.com/KingKDot/SomalifuscatorV2.git) script via a Python backend.
*   **Deobfuscate:** Process the uploaded file using the included custom `deobfuscator.py` script via the Python backend.
*   **Example Script:** Load a sample batch script for quick testing and demonstration.
*   **Side-by-Side View:** Compare the original uploaded code with the processed (obfuscated or deobfuscated) code.
*   **Copy to Clipboard:** Easily copy the original or processed code.
*   **Responsive Design:** Styled with Tailwind CSS for usability on different screen sizes.

## Tech Stack

*   **Frontend:**
    *   React 18
    *   Vite (Build Tool & Dev Server)
    *   TypeScript
    *   Tailwind CSS (Styling)
    *   Node.js / npm (Package Management)
*   **Backend:**
    *   Python 3
    *   Flask (Web Framework)
    *   Flask-CORS (Cross-Origin Resource Sharing)
    *   Supabase (Optional, for potential future database interactions - client included)
*   **Development:**
    *   `concurrently` (To run frontend and backend servers simultaneously)
    *   GitHub Codespaces (Tested Environment)

## Getting Started

These instructions cover setting up the project locally or within a development environment like GitHub Codespaces.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js)
*   [Python](https://www.python.org/) (v3.10 or later recommended)
*   [pip](https://pip.pypa.io/en/stable/installation/) (comes with Python)
*   [Git](https://git-scm.com/)

### Installation

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory-name> # e.g., cd DE-SomalifuscatorV2
    ```

2.  **Set up Backend:**
    *   **Place Original Obfuscator:** Ensure the code for the original SomalifuscatorV2 is located inside the `backend/` directory in a folder named `OG CODE`. If you haven't cloned it yet:
        ```bash
        cd backend
        git clone https://github.com/KingKDot/SomalifuscatorV2.git "OG CODE"
        cd ..
        ```
    *   **Install Backend Dependencies:** Navigate to the backend directory and install requirements for *both* the Flask app and the original obfuscator:
        ```bash
        cd backend
        pip install -r requirements.txt
        pip install -r "OG CODE/requirements.txt"
        cd ..
        ```
    *   *(Optional)* **Environment Variables:** Create a `.env` file inside the `backend/` directory for Supabase keys if you plan to use database integration. See the Environment Variables section below.

3.  **Install Frontend Dependencies:**
    From the project **root directory** (`DE-SomalifuscatorV2/`), run:
    ```bash
    npm install
    ```

### Running the Application

This project uses `concurrently` to start both the Vite frontend development server and the Flask backend server with a single command.

1.  **Start Both Servers:**
    From the project **root directory**, run:
    ```bash
    npm run dev
    ```

2.  **Accessing the UI:**
    *   **Local Development:** Open your browser and navigate to `http://localhost:5173`.
    *   **GitHub Codespaces:**
        *   When you run `npm run dev`, Codespaces should automatically detect the running servers and forward the necessary ports.
        *   Go to the **"Ports"** tab in your VS Code Codespace interface (usually in the bottom panel).
        *   Find the entry for port **5173** (the frontend). Make sure its "Visibility" is set to **Public**.
        *   Click on the **"Local Address"** URL listed next to port 5173. It will look something like `https://[your-codespace-name]-[hash]-5173.app.github.dev/`. **Use this URL** in your browser.
        *   The backend on port 5001 should also be forwarded (ensure it's Public too). The frontend is configured to automatically detect the Codespaces environment and adjust the API endpoint URL it calls.

The Vite server (`[0]` or `[dev:vite]` in the terminal) handles the frontend, while the Flask server (`[1]` or `[dev:backend]`) handles the API requests for obfuscation/deobfuscation.

## Environment Variables (Backend)

The backend uses a `.env` file located in the `backend/` directory to manage sensitive keys, primarily for Supabase integration (which is currently optional in the provided code but can be expanded).

Create a file named `backend/.env` and add the following variables if needed:

```dotenv
# --- Supabase Credentials (Optional) ---
# Get these from your Supabase project dashboard
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_ROLE_SECRET_KEY

# --- Flask Settings (Optional) ---
# FLASK_DEBUG=true # Set to 'false' for production builds
# PORT=5001      # Default port if not set
```

**IMPORTANT:** Never commit your actual `.env` file containing secrets to Git. Use a `.env.example` file to document required variables if collaborating. The provided `.gitignore` file prevents `.env` from being tracked. If Supabase keys are not provided, the integration will be disabled, but the core obfuscation/deobfuscation will still work.

## Project Structure

```
DE-SomalifuscatorV2/
├── backend/                  # Python Flask backend
│   ├── OG CODE/              # Original SomalifuscatorV2 code MUST be here
│   │   ├── src/
│   │   └── requirements.txt  # Requirements for original script
│   ├── app.py                # Flask application logic
│   ├── deobfuscator.py       # Custom Python deobfuscator script
│   ├── requirements.txt      # Requirements for Flask backend
│   └── .env                  # (Optional) Environment variables (ignored by git)
├── node_modules/             # Frontend dependencies (ignored by git)
├── public/                   # Static assets for Vite frontend
│   └── vite.svg
├── src/                      # Frontend React source code
│   ├── components/           # React UI components
│   ├── App.tsx               # Main application component
│   ├── index.css             # Global styles & Tailwind directives
│   └── main.tsx              # Frontend entry point
├── .gitignore                # Specifies intentionally untracked files
├── index.html                # Root HTML file for Vite
├── package.json              # Frontend dependencies and scripts
├── package-lock.json         # Frontend dependency lock file
├── postcss.config.js         # PostCSS configuration (for Tailwind)
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration for frontend
├── tsconfig.node.json        # TypeScript configuration for Vite config
├── vite.config.ts            # Vite configuration
└── README.md                 # This file
```

## Related Links

*   **Original SomalifuscatorV2:** [https://github.com/KingKDot/SomalifuscatorV2.git](https://github.com/KingKDot/SomalifuscatorV2.git)
