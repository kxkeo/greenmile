import { createContext, useContext, useState, useEffect } from 'react'

const SchoolContext = createContext({})

const DEFAULTS = {
  schoolName: 'Dinuba High School',
  mascot: 'Emperors',
  program: 'Football',
  address: '',
  logoUrl: '',
}

export function SchoolProvider({ children }) {
  const [school, setSchool] = useState(DEFAULTS)

  useEffect(() => {
    fetch('/api/school')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSchool(s => ({ ...s, ...data })) })
      .catch(() => {})
  }, [])

  return (
    <SchoolContext.Provider value={{ school, setSchool }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  return useContext(SchoolContext)
}
