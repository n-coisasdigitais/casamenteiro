import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;

// Nas rotas prerenderizadas, o #root vem com HTML estático para crawlers.
// createRoot().render() NÃO remove filhos pré-existentes — precisamos limpar
// manualmente, senão o conteúdo estático fica duplicado sob o app React.
if (rootEl.hasChildNodes()) {
  rootEl.innerHTML = "";
}

createRoot(rootEl).render(<App />);
