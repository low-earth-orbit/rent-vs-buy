import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
} from "@mantine/core";
import "./index.css";
import App from "./App";

const theme = createTheme({
  primaryColor: "teal",
  fontFamily: "Lato, sans-serif",
  headings: { fontFamily: "Lato, sans-serif" },
});

const colorSchemeManager = localStorageColorSchemeManager({
  key: "rent-vs-buy-color-scheme",
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      colorSchemeManager={colorSchemeManager}
    >
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
