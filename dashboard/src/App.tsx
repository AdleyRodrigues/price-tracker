import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { OverviewPage } from '@/pages/OverviewPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="produto/:produtoChave" element={<ProductDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
