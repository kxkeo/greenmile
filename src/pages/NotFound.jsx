import { Button } from '../components/ui'

export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center">
      <div className="section text-center">
        <div className="display text-field-500/40 text-[7rem] sm:text-[10rem] leading-none">4ᴼ4</div>
        <h1 className="display text-white text-3xl sm:text-4xl -mt-4">Fumbled the Snap</h1>
        <p className="mt-4 text-zinc-400 max-w-md mx-auto">
          That page isn't on the field. Let's get you back in the game.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button to="/" size="lg">Back to Home</Button>
          <Button to="/volunteer" variant="outline" size="lg">Join the Boosters</Button>
        </div>
      </div>
    </section>
  )
}
