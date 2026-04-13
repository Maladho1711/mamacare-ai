import PatientNav from '@/components/patient/PatientNav';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PatientNav>{children}</PatientNav>;
}
