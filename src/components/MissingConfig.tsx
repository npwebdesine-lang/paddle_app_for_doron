/** Shown when the build has no Supabase env vars, instead of a blank page. */
export default function MissingConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-red-700">האפליקציה לא מוגדרת</h1>
        <p className="text-sm text-slate-600">
          בגרסה הזו חסרים המשתנים <code dir="ltr" className="font-mono">VITE_SUPABASE_URL</code> ו/או{' '}
          <code dir="ltr" className="font-mono">VITE_SUPABASE_ANON_KEY</code>. יש להגדיר אותם בקובץ{' '}
          <code dir="ltr">.env</code> המקומי, או במשתני הסביבה של שירות האחסון, ואז לבנות / לפרוס מחדש.
        </p>
      </div>
    </div>
  )
}
