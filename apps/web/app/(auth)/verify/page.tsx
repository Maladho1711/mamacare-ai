import { Suspense } from 'react';
import Spinner from '@/components/ui/Spinner';
import VerifyForm from './VerifyForm';

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
