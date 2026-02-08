# Manual Run Instructions

Follow these steps to set up and run the Eternal Ride ERP project locally.

## Prerequisites

*   **Node.js:** Ensure you have Node.js installed (v16 or higher is recommended).
*   **npm:** npm is usually installed with Node.js.

## Easy Start (Recommended)

1.  Navigate to the project folder `c:\Users\aspec\.gemini\antigravity\playground\eternal-ride`.
2.  Double-click the `run_app.bat` file.
3.  This will automatically install dependencies (if needed) and start the application.

## Manual Installation

1.  Open your terminal or command prompt.
2.  Navigate to the project root directory:
    ```bash
    cd c:\Users\aspec\.gemini\antigravity\playground\eternal-ride
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

## Running the Application

1.  Start the development server:
    ```bash
    npm run devnpm run devnpm run dev
    ```
2.  The terminal will show the local URL (usually `http://localhost:5173/`).
3.  Open your browser and navigate to that URL to view the application.

## Accessing on Local Network (e.g., from Mobile)

To access the ERP on your mobile or other devices connected to the same WiFi:

1.  Run the dev server with the host flag:
    ```bash
    npm run dev -- --host
    ```
2.  The terminal will display a `Network` URL (e.g., `http://192.168.1.5:5173/`).
3.  Enter this URL in your mobile browser to use the app.

## Building for Production

To build the application for production:

1.  Run the build command:
    ```bash
    npm run build
    ```
2.  The built files will be in the `dist` directory.

## Linting

To run the linter and check for code quality issues:

```bash
npm run lint
```
