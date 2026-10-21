import { useParams } from 'react-router-dom';

import LessonReader from '@/components/learn/LessonReader';
import { getLesson, getSystem } from '@/data';
import { usePageMeta } from '@/lib/seo';
import NotFoundPage from '@/pages/NotFoundPage';

export default function LessonPage() {
  const { lessonId } = useParams();
  const lesson = getLesson(lessonId);
  const system = getSystem(lessonId?.replace('lesson-', ''));

  usePageMeta({
    title: lesson ? lesson.title : 'Lesson not found',
    description: lesson?.subtitle ?? 'A guided lesson through the human body.',
    path: `/learn/${lessonId ?? ''}`,
    type: 'article',
    noindex: !lesson,
  });

  if (!lesson) return <NotFoundPage />;

  return <LessonReader lesson={lesson} system={system} />;
}
