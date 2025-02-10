import { Navbar } from './Navbar'

export function Layout({ children }: { children: React.ReactNode }) {
  // children이 이미 Layout으로 감싸져 있는지 확인하는 로직 추가
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}