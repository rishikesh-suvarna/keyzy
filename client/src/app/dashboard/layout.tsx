import ProtectedRoute from '@/components/ProtectedRoute'
import VaultGate from '@/components/VaultGate'
import { VaultProvider } from '@/lib/vault'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <VaultProvider>
        <VaultGate>
          {children}
        </VaultGate>
      </VaultProvider>
    </ProtectedRoute>
  )
}
