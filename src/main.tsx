
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  // @ts-ignore: support CSS side-effect import
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  