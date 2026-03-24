import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { BoardView } from './pages/BoardView';
import BacklogView from './pages/BacklogView';
import CreateItem from './pages/CreateItem';
import ItemDetail from './pages/ItemDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/board" element={<BoardView />} />
          <Route path="/backlog" element={<BacklogView />} />
          <Route path="/items/new" element={<CreateItem />} />
          <Route path="/items/:id" element={<ItemDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
