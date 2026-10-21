import { Route, Routes } from 'react-router-dom';

import ErrorBoundary from '@/components/ErrorBoundary';
import AppShell from '@/components/layout/AppShell';
import HomePage from '@/pages/HomePage';
import ExplorePage from '@/pages/ExplorePage';
import SystemsPage from '@/pages/SystemsPage';
import SystemPage from '@/pages/SystemPage';
import OrganPage from '@/pages/OrganPage';
import LearnPage from '@/pages/LearnPage';
import LessonPage from '@/pages/LessonPage';
import QuizPage from '@/pages/QuizPage';
import GlossaryPage from '@/pages/GlossaryPage';
import AboutPage from '@/pages/AboutPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="systems" element={<SystemsPage />} />
          <Route path="systems/:systemId" element={<SystemPage />} />
          <Route path="organs/:organId" element={<OrganPage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/:lessonId" element={<LessonPage />} />
          <Route path="quiz" element={<QuizPage />} />
          <Route path="quiz/:systemId" element={<QuizPage />} />
          <Route path="glossary" element={<GlossaryPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
