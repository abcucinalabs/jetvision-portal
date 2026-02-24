export interface AirportDirectoryItem {
  name: string
  city: string
  icao: string
  iata: string
  countryCode: string
  countryName: string
}

// Local fallback directory for typeahead when Avinode airport-search scope is limited.
export const AIRPORT_DIRECTORY: AirportDirectoryItem[] = [
  { name: "Teterboro Airport", city: "Teterboro", icao: "KTEB", iata: "TEB", countryCode: "US", countryName: "United States" },
  { name: "Newark Liberty International Airport", city: "Newark", icao: "KEWR", iata: "EWR", countryCode: "US", countryName: "United States" },
  { name: "John F. Kennedy International Airport", city: "New York", icao: "KJFK", iata: "JFK", countryCode: "US", countryName: "United States" },
  { name: "LaGuardia Airport", city: "New York", icao: "KLGA", iata: "LGA", countryCode: "US", countryName: "United States" },
  { name: "Westchester County Airport", city: "White Plains", icao: "KHPN", iata: "HPN", countryCode: "US", countryName: "United States" },
  { name: "Morristown Municipal Airport", city: "Morristown", icao: "KMMU", iata: "MMU", countryCode: "US", countryName: "United States" },
  { name: "Miami International Airport", city: "Miami", icao: "KMIA", iata: "MIA", countryCode: "US", countryName: "United States" },
  { name: "Miami-Opa Locka Executive Airport", city: "Miami", icao: "KOPF", iata: "OPF", countryCode: "US", countryName: "United States" },
  { name: "Fort Lauderdale-Hollywood International Airport", city: "Fort Lauderdale", icao: "KFLL", iata: "FLL", countryCode: "US", countryName: "United States" },
  { name: "Palm Beach International Airport", city: "West Palm Beach", icao: "KPBI", iata: "PBI", countryCode: "US", countryName: "United States" },
  { name: "Van Nuys Airport", city: "Los Angeles", icao: "KVNY", iata: "VNY", countryCode: "US", countryName: "United States" },
  { name: "Los Angeles International Airport", city: "Los Angeles", icao: "KLAX", iata: "LAX", countryCode: "US", countryName: "United States" },
  { name: "Hollywood Burbank Airport", city: "Burbank", icao: "KBUR", iata: "BUR", countryCode: "US", countryName: "United States" },
  { name: "Long Beach Airport", city: "Long Beach", icao: "KLGB", iata: "LGB", countryCode: "US", countryName: "United States" },
  { name: "Chicago Midway International Airport", city: "Chicago", icao: "KMDW", iata: "MDW", countryCode: "US", countryName: "United States" },
  { name: "Chicago O'Hare International Airport", city: "Chicago", icao: "KORD", iata: "ORD", countryCode: "US", countryName: "United States" },
  { name: "Scottsdale Airport", city: "Scottsdale", icao: "KSDL", iata: "SCF", countryCode: "US", countryName: "United States" },
  { name: "Aspen/Pitkin County Airport", city: "Aspen", icao: "KASE", iata: "ASE", countryCode: "US", countryName: "United States" },
  { name: "Dallas Love Field", city: "Dallas", icao: "KDAL", iata: "DAL", countryCode: "US", countryName: "United States" },
  { name: "Dallas/Fort Worth International Airport", city: "Dallas", icao: "KDFW", iata: "DFW", countryCode: "US", countryName: "United States" },
  { name: "William P. Hobby Airport", city: "Houston", icao: "KHOU", iata: "HOU", countryCode: "US", countryName: "United States" },
  { name: "George Bush Intercontinental Airport", city: "Houston", icao: "KIAH", iata: "IAH", countryCode: "US", countryName: "United States" },
  { name: "McCarran International Airport", city: "Las Vegas", icao: "KLAS", iata: "LAS", countryCode: "US", countryName: "United States" },
  { name: "Harry Reid International Airport", city: "Las Vegas", icao: "KLAS", iata: "LAS", countryCode: "US", countryName: "United States" },
  { name: "Phoenix Sky Harbor International Airport", city: "Phoenix", icao: "KPHX", iata: "PHX", countryCode: "US", countryName: "United States" },
  { name: "San Francisco International Airport", city: "San Francisco", icao: "KSFO", iata: "SFO", countryCode: "US", countryName: "United States" },
  { name: "Oakland International Airport", city: "Oakland", icao: "KOAK", iata: "OAK", countryCode: "US", countryName: "United States" },
  { name: "San Jose Mineta International Airport", city: "San Jose", icao: "KSJC", iata: "SJC", countryCode: "US", countryName: "United States" },
  { name: "Seattle-Tacoma International Airport", city: "Seattle", icao: "KSEA", iata: "SEA", countryCode: "US", countryName: "United States" },
  { name: "Boston Logan International Airport", city: "Boston", icao: "KBOS", iata: "BOS", countryCode: "US", countryName: "United States" },
  { name: "Nashville International Airport", city: "Nashville", icao: "KBNA", iata: "BNA", countryCode: "US", countryName: "United States" },
  { name: "Orlando International Airport", city: "Orlando", icao: "KMCO", iata: "MCO", countryCode: "US", countryName: "United States" },
  { name: "Palm Springs International Airport", city: "Palm Springs", icao: "KPSP", iata: "PSP", countryCode: "US", countryName: "United States" },
  { name: "Toronto Pearson International Airport", city: "Toronto", icao: "CYYZ", iata: "YYZ", countryCode: "CA", countryName: "Canada" },
  { name: "Vancouver International Airport", city: "Vancouver", icao: "CYVR", iata: "YVR", countryCode: "CA", countryName: "Canada" },
  { name: "London Heathrow Airport", city: "London", icao: "EGLL", iata: "LHR", countryCode: "GB", countryName: "United Kingdom" },
  { name: "London Luton Airport", city: "London", icao: "EGGW", iata: "LTN", countryCode: "GB", countryName: "United Kingdom" },
  { name: "Paris Le Bourget Airport", city: "Paris", icao: "LFPB", iata: "LBG", countryCode: "FR", countryName: "France" },
  { name: "Paris Charles de Gaulle Airport", city: "Paris", icao: "LFPG", iata: "CDG", countryCode: "FR", countryName: "France" },
  { name: "Geneva Airport", city: "Geneva", icao: "LSGG", iata: "GVA", countryCode: "CH", countryName: "Switzerland" },
  { name: "Nice Cote d'Azur Airport", city: "Nice", icao: "LFMN", iata: "NCE", countryCode: "FR", countryName: "France" },
  { name: "Dubai International Airport", city: "Dubai", icao: "OMDB", iata: "DXB", countryCode: "AE", countryName: "United Arab Emirates" },
  { name: "Abu Dhabi International Airport", city: "Abu Dhabi", icao: "OMAA", iata: "AUH", countryCode: "AE", countryName: "United Arab Emirates" },
  { name: "Doha Hamad International Airport", city: "Doha", icao: "OTHH", iata: "DOH", countryCode: "QA", countryName: "Qatar" },
  { name: "Riyadh King Khalid International Airport", city: "Riyadh", icao: "OERK", iata: "RUH", countryCode: "SA", countryName: "Saudi Arabia" },
  { name: "Singapore Changi Airport", city: "Singapore", icao: "WSSS", iata: "SIN", countryCode: "SG", countryName: "Singapore" },
  { name: "Tokyo Haneda Airport", city: "Tokyo", icao: "RJTT", iata: "HND", countryCode: "JP", countryName: "Japan" },
  { name: "Tokyo Narita International Airport", city: "Tokyo", icao: "RJAA", iata: "NRT", countryCode: "JP", countryName: "Japan" },
  { name: "Hong Kong International Airport", city: "Hong Kong", icao: "VHHH", iata: "HKG", countryCode: "HK", countryName: "Hong Kong" },
  { name: "Sydney Kingsford Smith Airport", city: "Sydney", icao: "YSSY", iata: "SYD", countryCode: "AU", countryName: "Australia" }
]

export function searchAirportDirectory(query: string, limit = 20): AirportDirectoryItem[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const starts: AirportDirectoryItem[] = []
  const contains: AirportDirectoryItem[] = []

  for (const airport of AIRPORT_DIRECTORY) {
    const fields = [airport.name, airport.city, airport.icao, airport.iata].map((v) => v.toLowerCase())
    if (fields.some((v) => v.startsWith(q))) {
      starts.push(airport)
      continue
    }
    if (fields.some((v) => v.includes(q))) {
      contains.push(airport)
    }
  }

  const merged = [...starts, ...contains]
  const seen = new Set<string>()
  const unique: AirportDirectoryItem[] = []

  for (const airport of merged) {
    const key = `${airport.icao}-${airport.iata}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(airport)
    if (unique.length >= limit) break
  }

  return unique
}
