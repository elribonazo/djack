import { Provider } from "react-redux";
import { Routes, Route } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';

import { store } from "./reducers/store";
import "./styles/main.css";
import Index from "./routes";
import AppRoute from './routes/app';

const App = () => {
  return <Provider store={store}>
    <BrowserRouter>
      <Routes>
        <Route index element={<Index />} />
        <Route path="app" element={<AppRoute />} />
        <Route path="*" element={<p>There's nothing here: 404!</p>} />
      </Routes>
  </BrowserRouter>
</Provider>
}

export default App