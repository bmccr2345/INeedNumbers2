import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Conditionally apply StrictMode only in development
// In production, StrictMode's double mount/unmount can interfere with Clerk's session initialization
const Wrapper = process.env.NODE_ENV === 'development' ? React.StrictMode : React.Fragment;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Wrapper>
    <App />
  </Wrapper>,
);
