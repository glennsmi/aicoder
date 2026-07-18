import Hero from '../components/sections/Hero'
import Features from '../components/sections/Features'
import Pricing from '../components/sections/Pricing'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Pricing />
    </div>
  )
}

