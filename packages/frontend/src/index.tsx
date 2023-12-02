import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import "./styles/main.css";

import DefaultApp from './App'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (module.hot) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
    module.hot.accept('./App', () => {
      try {
        // Any code that triggers a HMR update
      } catch (error) {
        console.error('Error in the hot update:', error);
      }
    });
  }
  const root = ReactDOM.createRoot(
      document.getElementById("root") as HTMLElement
  );
  root.render(
    <DefaultApp />
  );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
