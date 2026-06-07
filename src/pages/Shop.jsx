import { useEffect, useState } from 'react'
import { Hero, SectionHeading, Button, EmptyState, Loading } from '../components/ui'
import { IMG } from '../content/images'

export default function Shop() {
  const [products, setProducts] = useState(undefined)

  useEffect(() => {
    fetch('/api/store/products')
      .then(r => r.ok ? r.json() : [])
      .then(list => setProducts(Array.isArray(list) ? list : (list?.products || [])))
      .catch(() => setProducts([]))
  }, [])

  return (
    <>
      <Hero
        image={IMG.gear}
        eyebrow="Emperor Gear"
        title="The Shop"
        subtitle="Rep the green and white. Every purchase puts money straight back into the program."
        minH="min-h-[54vh]"
      >
        <Button to="/donate" variant="outline" size="lg">Or Make a Gift</Button>
      </Hero>

      <section className="section py-20">
        {products === undefined ? (
          <Loading label="Loading the store…" />
        ) : products.length === 0 ? (
          <>
            <SectionHeading eyebrow="Coming soon" title="Store Launching Soon" intro="We're stocking the shelves with Emperor tees, hoodies, hats, and game-day gear." />
            <div className="mt-10 max-w-xl mx-auto">
              <EmptyState icon="🛍️" title="No products yet">
                Check back soon — or support the team now through a donation or booster membership.
              </EmptyState>
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <Button to="/donate" size="md">Donate</Button>
                <Button to="/volunteer" variant="outline" size="md">Join the Boosters</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <SectionHeading eyebrow="Gear up" title="Emperor Store" />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p, i) => (
                <div key={p.id || i} className="card-hover overflow-hidden">
                  <div className="bg-cover bg-center h-56 bg-charcoal-700"
                       style={{ backgroundImage: `url(${p.image_url || p.imageUrl || IMG.gear})` }} />
                  <div className="p-5">
                    <h3 className="font-heading uppercase tracking-wide text-white">{p.name || p.title}</h3>
                    {p.price_cents != null && (
                      <div className="mt-1 display text-field-400 text-2xl">${(p.price_cents / 100).toFixed(2)}</div>
                    )}
                    {p.description && <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{p.description}</p>}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-zinc-500">Full cart & checkout coming in the next update.</p>
          </>
        )}
      </section>
    </>
  )
}
