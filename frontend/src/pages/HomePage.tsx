import { useState, useEffect } from 'react'
import { User, createSuccessResponse } from '@shared'

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call using shared types
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'john@example.com',
        displayName: 'John Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        email: 'jane@example.com',
        displayName: 'Jane Smith',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-16'),
      }
    ]

    setTimeout(() => {
      setUsers(mockUsers)
      setLoading(false)
      
      // Example of using shared utility
      const response = createSuccessResponse(mockUsers, 'Users loaded successfully')
      console.log('API Response:', response)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Cursor Costs Template
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A modern React + Vite + Firebase template with Tailwind CSS v4 and shared data models.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">⚡ Vite</h3>
          <p className="text-gray-600">Lightning fast build tool with hot module replacement</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🔥 Firebase</h3>
          <p className="text-gray-600">Backend services with Functions v2 in Europe West 2</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🎨 Tailwind v4</h3>
          <p className="text-gray-600">Latest Tailwind CSS with improved performance</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Example Users (Shared Models)</h2>
        <div className="grid gap-4">
          {users.map((user) => (
            <div key={user.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{user.displayName}</h3>
                  <p className="text-gray-600">{user.email}</p>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Created: {user.createdAt.toLocaleDateString()}</p>
                  <p>Updated: {user.updatedAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 