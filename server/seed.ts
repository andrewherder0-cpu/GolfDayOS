import { storage } from "./storage";
import { geocodeAddress, sleep } from "./utils/geocode";

interface CsvCourse {
  name: string;
  address: string | null;
  city: string;
  region: string;
  postalCode: string | null;
  weekdayFee: string | null;
  weekendFee: string | null;
  website: string | null;
  phone: string | null;
  notes: string;
}

function nullify(val: string): string | null {
  return val === "Not found" || val === "" ? null : val;
}

function normalizeWebsite(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `https://www.${raw}`;
}

function buildFeeNote(c: CsvCourse): string | null {
  const wd = c.weekdayFee;
  const we = c.weekendFee;
  if (!wd && !we) return null;
  if (wd === "Members only" || we === "Members only") return "Members only";
  if (wd === we && wd) return wd;
  if (wd && we) return `Weekday: ${wd} / Weekend: ${we}`;
  return wd ?? we;
}

function buildTags(c: CsvCourse): string[] {
  const tags: string[] = [];
  const n = c.notes.toLowerCase();
  if (n.includes("18-hole") || n.includes("18 hole") || n.includes("par 72")) tags.push("18-holes");
  if (n.includes("27 hole") || n.includes("27-hole")) tags.push("27-holes");
  if (n.includes("36-hole") || n.includes("3 x 18")) tags.push("36-holes");
  if (n.includes("championship")) tags.push("championship");
  if (n.includes("private") || (c.weekdayFee === "Members only")) tags.push("private");
  if (n.includes("semi-private")) tags.push("semi-private");
  if (n.includes("public")) tags.push("public");
  if (n.includes("municipal")) tags.push("municipal");
  if (n.includes("resort")) tags.push("resort");
  if (n.includes("links")) tags.push("links");
  if (n.includes("stanley thompson")) tags.push("stanley-thompson");
  return Array.from(new Set(tags));
}

function buildGeoQuery(c: CsvCourse): string {
  if (c.address) {
    const postal = c.postalCode ? ` ${c.postalCode}` : "";
    return `${c.address}, ${c.city}, ON${postal}, Canada`;
  }
  // Fall back to name + city for better accuracy than just city
  return `${c.name}, ${c.city}, Ontario, Canada`;
}

// Pre-geocoded coordinates keyed by course name (updated from verified CSV data)
const GEOCODED_COORDS: Record<string, { lat: number; lng: number }> = {
  "4 Seasons Country Club": { lat: 43.9313625, lng: -78.5548831 },
  "Angus Glen Golf Club (North Course)": { lat: 43.9020569, lng: -79.3386868 },
  "Angus Glen Golf Club (South Course)": { lat: 43.9020569, lng: -79.3386868 },
  "Bathurst Glen Golf Course": { lat: 43.9277562, lng: -79.4715543 },
  "Bear Creek Golf Club": { lat: 44.4256710, lng: -79.6948258 },
  "Bloomington Downs Golf Course": { lat: 43.9647759, lng: -79.4251044 },
  "BraeBen Golf Course": { lat: 43.5994044, lng: -79.6965884 },
  "Brantford Golf & Country Club": { lat: 43.1619315, lng: -80.3037926 },
  "Burlington Golf & Country Club": { lat: 43.3957325, lng: -79.8981942 },
  "Bushwood Golf Club": { lat: 43.9451651, lng: -79.2179728 },
  "Caledon Country Club": { lat: 43.7858823, lng: -79.9265565 },
  "Cambridge Golf Club": { lat: 43.3811657, lng: -80.2444778 },
  "Cardinal 18 Golf Club": { lat: 44.3383554, lng: -78.7213848 },
  "Cardinal Golf Club": { lat: 44.0405399, lng: -79.5691468 },
  "Chedoke Golf Club": { lat: 43.2492335, lng: -79.9125336 },
  "Conestoga Golf Club": { lat: 43.5464667, lng: -80.4991738 },
  "Copper Creek Golf Club": { lat: 43.8586577, lng: -79.6373950 },
  "Crosswinds Golf Course": { lat: 43.4466837, lng: -79.9127192 },
  "Deer Creek Golf Club": { lat: 43.9091394, lng: -79.0247631 },
  "Deerfield Golf Club": { lat: 43.4184182, lng: -79.7391921 },
  "Dentonia Park Golf Course": { lat: 43.6976376, lng: -79.2893596 },
  "Don Valley Golf Course": { lat: 43.7473872, lng: -79.4114093 },
  "Doon Valley Golf Course": { lat: 43.3941344, lng: -80.3985142 },
  "Dragon's Fire Golf Club": { lat: 43.3813912, lng: -79.9529441 },
  "Glencairn Golf Club": { lat: 43.5608885, lng: -79.9421639 },
  "Grand Niagara Golf": { lat: 43.0360796, lng: -79.1309337 },
  "Grey Silo Golf Course": { lat: 43.5201558, lng: -80.4752443 },
  "Guelph Lakes Golf & Country Club": { lat: 43.5977678, lng: -80.2275118 },
  "Harmony Creek Golf Centre": { lat: 43.8891097, lng: -78.8193516 },
  "Heritage Hills Golf Club": { lat: 44.4256710, lng: -79.6948258 },
  "Humber Valley Golf Course": { lat: 43.7245208, lng: -79.5445896 },
  "Innisbrook Golf Course": { lat: 44.3252571, lng: -79.6624110 },
  "Innisfil Creek Golf Course": { lat: 44.3000, lng: -79.6500 },
  "Kawartha Golf and Country Club": { lat: 44.3314915, lng: -78.3057714 },
  "King's Forest Golf Club": { lat: 43.2148249, lng: -79.8091626 },
  "Legends on the Niagara (Battlefield Course)": { lat: 43.1289116, lng: -79.0662540 },
  "Legends on the Niagara (Ussher's Creek Course)": { lat: 43.1289116, lng: -79.0662540 },
  "Lindsay Golf & Country Club": { lat: 44.3383554, lng: -78.7213848 },
  "Lionhead Golf Club (Legends Course)": { lat: 43.6278607, lng: -79.7761767 },
  "Lionhead Golf Club (Masters Course)": { lat: 43.6278607, lng: -79.7761767 },
  "National Pines Golf Club": { lat: 44.3232794, lng: -79.6538148 },
  "Niagara Falls Golf Club": { lat: 43.0829762, lng: -79.1553127 },
  "Niagara National Golf & Country Club": { lat: 43.1289116, lng: -79.0662540 },
  "Oakville Golf Club": { lat: 43.4560377, lng: -79.7013398 },
  "Paris Grand Golf Club": { lat: 43.2081168, lng: -80.3771096 },
  "Pickering Glen Golf Club": { lat: 43.9672508, lng: -79.0360449 },
  "Pickering Golf Club": { lat: 43.9672508, lng: -79.0360449 },
  "Richmond Hill Golf Club": { lat: 43.8390480, lng: -79.4550000 },
  "Riverside Golf Club": { lat: 43.9091394, lng: -79.0247631 },
  "Rockway Golf Course": { lat: 43.4346856, lng: -80.4698923 },
  "Royal Ashburn Golf Club": { lat: 43.9672508, lng: -79.0360449 },
  "Royal Ontario Golf Club": { lat: 43.5408787, lng: -79.7972491 },
  "Sawmill Golf Course": { lat: 43.0829762, lng: -79.1553127 },
  "St. Andrew's Valley Golf Club": { lat: 43.9647759, lng: -79.4251044 },
  "St. Catharines Golf and Country Club": { lat: 43.1567109, lng: -79.2376054 },
  "TPC Toronto at Osprey Valley": { lat: 43.8478111, lng: -80.0389348 },
  "Tangle Creek Golf": { lat: 44.3228176, lng: -79.7565527 },
  "The Nest Golf Club at Friday Harbour": { lat: 44.3252571, lng: -79.6624110 },
  "Thundering Waters Golf Club": { lat: 43.0608224, lng: -79.0916211 },
  "Victoria Park East Golf Club": { lat: 43.4767769, lng: -80.1213153 },
  "Walter Gretzky Municipal Golf Course": { lat: 43.1619315, lng: -80.3037926 },
};

const CSV_COURSES: CsvCourse[] = [
  { name: "Lionhead Golf Club (Legends Course)", address: "8525 Mississauga Road", city: "Brampton", region: "ON", postalCode: "L6Y 0C1", weekdayFee: "$125-$165 (cart incl.)", weekendFee: "$125-$165 (cart incl.)", website: "kaneffgolf.com/golf/courses/lionhead/", phone: null, notes: "18-hole championship" },
  { name: "Lionhead Golf Club (Masters Course)", address: "8525 Mississauga Road", city: "Brampton", region: "ON", postalCode: "L6Y 0C1", weekdayFee: "$125-$165 (cart incl.)", weekendFee: "$125-$165 (cart incl.)", website: "kaneffgolf.com/golf/courses/lionhead/", phone: null, notes: "18-hole championship" },
  { name: "BraeBen Golf Course", address: "5700 Terry Fox Way", city: "Mississauga", region: "ON", postalCode: "L5V 1X7", weekdayFee: "$65.39", weekendFee: "$84.87", website: "mississauga.ca/golf", phone: null, notes: "City of Mississauga municipal course 18-hole" },
  { name: "Caledon Country Club", address: "2121 Olde Baseline Road", city: "Caledon", region: "ON", postalCode: "L7C 0K7", weekdayFee: "$85.00", weekendFee: null, website: "golfcaledon.com", phone: null, notes: "Public 18-hole" },
  { name: "TPC Toronto at Osprey Valley", address: "Hwy 9 & Airport Road", city: "Caledon East", region: "ON", postalCode: "L7C 1V3", weekdayFee: null, weekendFee: null, website: "tpctoronto.ca", phone: null, notes: "3 x 18-hole courses championship" },
  { name: "Don Valley Golf Course", address: "4200 Yonge Street", city: "Toronto", region: "ON", postalCode: "M2P 2B5", weekdayFee: null, weekendFee: null, website: "toronto.ca/golf", phone: null, notes: "City of Toronto municipal 18-hole" },
  { name: "Humber Valley Golf Course", address: "40 Beattie Ave", city: "Toronto", region: "ON", postalCode: "M9P 3A3", weekdayFee: null, weekendFee: null, website: "toronto.ca/golf", phone: null, notes: "City of Toronto municipal 18-hole" },
  { name: "Dentonia Park Golf Course", address: "781 Victoria Park Ave", city: "Toronto", region: "ON", postalCode: "M4C 5L6", weekdayFee: null, weekendFee: null, website: "toronto.ca/golf", phone: null, notes: "City of Toronto municipal 18-hole" },
  { name: "Burlington Golf & Country Club", address: "777 Golf Links Road", city: "Burlington", region: "ON", postalCode: "L7R 3X8", weekdayFee: "Members only", weekendFee: "Members only", website: "burlingtongolfclub.com", phone: null, notes: "Private, Stanley Thompson design 18-hole" },
  { name: "Crosswinds Golf Course", address: "2490 Britannia Road", city: "Burlington", region: "ON", postalCode: "L7M 0B2", weekdayFee: null, weekendFee: null, website: "crosswindsgolf.com", phone: null, notes: "Public 18-hole championship" },
  { name: "Deerfield Golf Club", address: "2363 North Service Rd W", city: "Oakville", region: "ON", postalCode: "L6M 3H8", weekdayFee: null, weekendFee: null, website: "golfdeerfield.com", phone: null, notes: "Public 18-hole" },
  { name: "Oakville Golf Club", address: "1154 Third Line", city: "Oakville", region: "ON", postalCode: "L6M 3Z7", weekdayFee: "Members only", weekendFee: "Members only", website: "oakvillegolfclub.com", phone: null, notes: "Private member-owned 18-hole" },
  { name: "Dragon's Fire Golf Club", address: "1060 Golf Lane", city: "Flamborough", region: "ON", postalCode: "L0R 1B0", weekdayFee: null, weekendFee: null, website: "dragonsfiregolf.com", phone: null, notes: "Semi-private 18-hole" },
  { name: "Chedoke Golf Club", address: "1 Cootes Drive", city: "Hamilton", region: "ON", postalCode: "L8S 1B7", weekdayFee: null, weekendFee: null, website: "hamilton.ca/golf", phone: null, notes: "City of Hamilton municipal 18-hole" },
  { name: "King's Forest Golf Club", address: "100 Greenhill Ave", city: "Hamilton", region: "ON", postalCode: "L8K 5G9", weekdayFee: null, weekendFee: null, website: "hamilton.ca/golf", phone: null, notes: "City of Hamilton municipal 18-hole" },
  { name: "Doon Valley Golf Course", address: "500 Doon Valley Drive", city: "Kitchener", region: "ON", postalCode: "N2P 1A5", weekdayFee: null, weekendFee: null, website: "kitchener.ca", phone: null, notes: "City of Kitchener municipal 18-hole" },
  { name: "Rockway Golf Course", address: "1455 Rockway Drive", city: "Kitchener", region: "ON", postalCode: "N2G 3A9", weekdayFee: null, weekendFee: null, website: "kitchener.ca", phone: null, notes: "City of Kitchener municipal 18-hole" },
  { name: "Cambridge Golf Club", address: "1346 Clyde Road", city: "Cambridge", region: "ON", postalCode: "N1R 5S7", weekdayFee: null, weekendFee: null, website: "cambridgegolfclub.com", phone: "(519) 621-5491", notes: "18-hole semi-private" },
  { name: "Victoria Park East Golf Club", address: "1096 Victoria Rd. South", city: "Puslinch", region: "ON", postalCode: "N0B 2J0", weekdayFee: "$39.00", weekendFee: "$43.00", website: "victoriaparkgolf.com", phone: "519-821-2211", notes: "Public 18-hole" },
  { name: "Guelph Lakes Golf & Country Club", address: null, city: "Guelph", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "guelphlakesgolf.ca", phone: null, notes: "18-hole" },
  { name: "Conestoga Golf Club", address: null, city: "Conestoga", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: null, phone: null, notes: "27 holes (semi-private)" },
  { name: "Grey Silo Golf Course", address: "1001 Tower Street South", city: "Waterloo", region: "ON", postalCode: "N2V 0C3", weekdayFee: null, weekendFee: null, website: "greysilo.ca", phone: null, notes: "18-hole public" },
  { name: "Innisbrook Golf Course", address: null, city: "Barrie", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "golfinnisbrook.com", phone: "705-721-9210", notes: "18-hole" },
  { name: "Bear Creek Golf Club", address: "3500 Bear Creek Road", city: "Barrie", region: "ON", postalCode: "L4N 9A8", weekdayFee: null, weekendFee: null, website: "bearcreekgolfing.com", phone: null, notes: "27 holes (3 x 18-hole combos)" },
  { name: "Tangle Creek Golf", address: "4730 Sideroad 25", city: "Thornton", region: "ON", postalCode: "L0L 2K0", weekdayFee: null, weekendFee: null, website: "tanglecreekgolf.com", phone: null, notes: "18-hole" },
  { name: "Heritage Hills Golf Club", address: null, city: "Barrie", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "heritagehillsgolfclub.com", phone: null, notes: "18-hole, 6800 yards" },
  { name: "Innisfil Creek Golf Course", address: "239 Reive Blvd", city: "Cookstown", region: "ON", postalCode: "L0L 1L0", weekdayFee: null, weekendFee: null, website: "innisfilcreekgolf.com", phone: null, notes: "18-hole" },
  { name: "National Pines Golf Club", address: "8165 10 Sideroad", city: "Innisfil", region: "ON", postalCode: "L9S 4T3", weekdayFee: null, weekendFee: null, website: "nationalpines.ca", phone: "(705) 431-7000", notes: "Private members course 18-hole" },
  { name: "The Nest Golf Club at Friday Harbour", address: "1 Marina Way", city: "Innisfil", region: "ON", postalCode: "L9S 0M5", weekdayFee: null, weekendFee: null, website: "fridayharbour.com/golf-the-nest", phone: null, notes: "18-hole resort course" },
  { name: "Angus Glen Golf Club (North Course)", address: "10080 Kennedy Road", city: "Markham", region: "ON", postalCode: "L6C 1N9", weekdayFee: null, weekendFee: null, website: "angusglen.com", phone: null, notes: "World-class public championship 18-hole" },
  { name: "Angus Glen Golf Club (South Course)", address: "10080 Kennedy Road", city: "Markham", region: "ON", postalCode: "L6C 1N9", weekdayFee: null, weekendFee: null, website: "angusglen.com", phone: null, notes: "World-class public championship 18-hole" },
  { name: "Cardinal Golf Club", address: "2740 Davis Drive W", city: "King", region: "ON", postalCode: "L7B 0L3", weekdayFee: null, weekendFee: null, website: "cardinalgolfcomplex.com", phone: null, notes: "Multiple 18-hole courses public" },
  { name: "Copper Creek Golf Club", address: "10651 Hwy 27", city: "Kleinburg", region: "ON", postalCode: "L0J 1C0", weekdayFee: null, weekendFee: null, website: "coppercreek.ca", phone: null, notes: "Top public 18-hole course championship" },
  { name: "Richmond Hill Golf Club", address: "8905 Bathurst Street", city: "Richmond Hill", region: "ON", postalCode: "L4E 0B7", weekdayFee: null, weekendFee: null, website: "richmondhillgolf.com", phone: null, notes: "18-hole; Spring $95, In-season higher" },
  { name: "Bloomington Downs Golf Course", address: null, city: "Richmond Hill", region: "ON", postalCode: "L4E 3E6", weekdayFee: null, weekendFee: null, website: "bloomingtondowns.ca", phone: "905-773-1936", notes: "18-hole" },
  { name: "Bathurst Glen Golf Course", address: null, city: "Richmond Hill", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "bathurstglengolf.ca", phone: null, notes: "Public 18-hole Ontario Provincial Gov." },
  { name: "St. Andrew's Valley Golf Club", address: null, city: "Aurora", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "standrewsvalley.com", phone: null, notes: "18-hole 30 min north of Toronto" },
  { name: "Bushwood Golf Club", address: null, city: "Markham", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "bushwoodgolf.com", phone: null, notes: "18-hole championship par 72" },
  { name: "Pickering Glen Golf Club", address: null, city: "Pickering", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "pickeringglen.com", phone: null, notes: "18-hole public" },
  { name: "Pickering Golf Club", address: null, city: "Pickering", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "pickeringgolfclub.com", phone: null, notes: "18-hole" },
  { name: "Royal Ashburn Golf Club", address: null, city: "Whitby", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "royalashburngolfclub.com", phone: null, notes: "18-hole public" },
  { name: "Deer Creek Golf Club", address: null, city: "Ajax", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "mydeercreek.com", phone: null, notes: "18-hole public, Durham Region" },
  { name: "Harmony Creek Golf Centre", address: null, city: "Oshawa", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "harmonycreekgolf.com", phone: null, notes: "18-hole public" },
  { name: "Riverside Golf Club", address: null, city: "Ajax", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "riversidegolfclub.ca", phone: null, notes: "18-hole" },
  { name: "4 Seasons Country Club", address: null, city: "Whitby", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "4seasonscountryclub.ca", phone: null, notes: "18-hole scenic course" },
  { name: "Niagara Falls Golf Club", address: "6169 Garner Road", city: "Niagara Falls", region: "ON", postalCode: "L2E 6S4", weekdayFee: null, weekendFee: null, website: "niagarafallsgolf.com", phone: null, notes: "Par 72 18-hole" },
  { name: "St. Catharines Golf and Country Club", address: "70 Westchester Ave", city: "St. Catharines", region: "ON", postalCode: "L2R 3P4", weekdayFee: null, weekendFee: null, website: "stgcc.com", phone: null, notes: "Private club 18-hole" },
  { name: "Sawmill Golf Course", address: null, city: "Niagara-on-the-Lake", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "sawmillgolf.com", phone: null, notes: "18 memorable holes" },
  { name: "Legends on the Niagara (Battlefield Course)", address: "9000 Niagara Parkway", city: "Niagara Falls", region: "ON", postalCode: "L2E 6S6", weekdayFee: null, weekendFee: null, website: "niagaraparks.com/golf", phone: null, notes: "Championship 18-hole Niagara Parks" },
  { name: "Legends on the Niagara (Ussher's Creek Course)", address: "9000 Niagara Parkway", city: "Niagara Falls", region: "ON", postalCode: "L2E 6S6", weekdayFee: null, weekendFee: null, website: "niagaraparks.com/golf", phone: null, notes: "Championship 18-hole Niagara Parks" },
  { name: "Grand Niagara Golf", address: "8547 Grassy Brook Road", city: "Niagara Falls", region: "ON", postalCode: "L2H 0G9", weekdayFee: null, weekendFee: null, website: "grandniagararesort.com", phone: null, notes: "18-hole public championship" },
  { name: "Thundering Waters Golf Club", address: "6000 Marineland Parkway", city: "Niagara Falls", region: "ON", postalCode: "L2G 0E3", weekdayFee: null, weekendFee: null, website: null, phone: null, notes: "18-hole public" },
  { name: "Niagara National Golf & Country Club", address: null, city: "Niagara Falls", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "niagaranational.ca", phone: null, notes: "18-hole; membership/tournament inquiries" },
  { name: "Kawartha Golf and Country Club", address: null, city: "Peterborough", region: "ON", postalCode: null, weekdayFee: "$130.00", weekendFee: "$130.00", website: "kawarthagolf.ca", phone: null, notes: "18-hole Stanley Thompson design" },
  { name: "Lindsay Golf & Country Club", address: null, city: "Lindsay", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "lindsaygolf.ca", phone: null, notes: "18-hole championship Kawartha Lakes" },
  { name: "Cardinal 18 Golf Club", address: null, city: "Lindsay", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "cardinal18.com", phone: null, notes: "18-hole championship" },
  { name: "Brantford Golf & Country Club", address: "60 Ava Road", city: "Brantford", region: "ON", postalCode: "N3T 5H2", weekdayFee: "Members only", weekendFee: "Members only", website: "brantfordgolfandcountryclub.com", phone: "519-752-3731", notes: "Private club 18-hole" },
  { name: "Walter Gretzky Municipal Golf Course", address: null, city: "Brantford", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: "brantford.ca", phone: null, notes: "18-hole championship municipal" },
  { name: "Paris Grand Golf Club", address: "150 Paris Links Road", city: "Paris", region: "ON", postalCode: "N3L 3E2", weekdayFee: "$40-$49", weekendFee: "$50-$59", website: null, phone: null, notes: "18-hole semi-private" },
  { name: "Glencairn Golf Club", address: "9807 Regional Road 25", city: "Halton Hills", region: "ON", postalCode: "L9T 2X7", weekdayFee: null, weekendFee: null, website: "glencairn.clublink.ca", phone: "905-876-3666", notes: "ClubLink 18-hole" },
  { name: "Royal Ontario Golf Club", address: null, city: "Milton", region: "ON", postalCode: null, weekdayFee: null, weekendFee: null, website: null, phone: null, notes: "18-hole" },
];

export async function geocodeAndSeedCourses(): Promise<{ inserted: number; updated: number; failed: string[] }> {
  const existing = await storage.searchCourses();
  const existingByName = new Map(existing.map(c => [c.name, c]));
  const csvNames = new Set(CSV_COURSES.map(c => c.name));

  let inserted = 0;
  let updated = 0;
  const failed: string[] = [];

  for (const csvCourse of CSV_COURSES) {
    try {
      const geoQuery = buildGeoQuery(csvCourse);
      console.log(`[seed] Geocoding: "${geoQuery}"`);
      const geo = await geocodeAddress(geoQuery);
      await sleep(150); // Respect rate limits

      const courseData = {
        name: csvCourse.name,
        address: csvCourse.address ?? undefined,
        city: csvCourse.city,
        region: csvCourse.region,
        lat: geo?.lat ?? undefined,
        lng: geo?.lng ?? undefined,
        tags: buildTags(csvCourse),
        feeNote: buildFeeNote(csvCourse) ?? undefined,
        website: normalizeWebsite(csvCourse.website) ?? undefined,
        phone: csvCourse.phone ?? undefined,
        isActive: true,
      };

      const existing2 = existingByName.get(csvCourse.name);
      if (existing2) {
        await storage.updateCourse(existing2.id, courseData);
        updated++;
        console.log(`[seed] Updated: ${csvCourse.name} ${geo ? `(${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})` : "(no coords)"}`);
      } else {
        await storage.createCourse(courseData);
        inserted++;
        console.log(`[seed] Inserted: ${csvCourse.name} ${geo ? `(${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})` : "(no coords)"}`);
      }
    } catch (err) {
      console.error(`[seed] Failed: ${csvCourse.name}`, err);
      failed.push(csvCourse.name);
    }
  }

  // Deactivate courses no longer in the CSV
  for (const existingCourse of existing) {
    if (!csvNames.has(existingCourse.name)) {
      await storage.updateCourse(existingCourse.id, { isActive: false });
      console.log(`[seed] Deactivated old course: ${existingCourse.name}`);
    }
  }

  return { inserted, updated, failed };
}

// Startup seed — inserts CSV courses with pre-geocoded coordinates if none exist yet
export async function seedGtaCourses(): Promise<void> {
  const existing = await storage.searchCourses();
  if (existing.length > 0) {
    // Update coordinates for all courses with verified CSV data
    let updated = 0;
    for (const course of existing) {
      const coords = GEOCODED_COORDS[course.name];
      if (!coords) continue;
      const latDiff = Math.abs((course.lat ?? 0) - coords.lat);
      const lngDiff = Math.abs((course.lng ?? 0) - coords.lng);
      // Update if missing or differs by more than ~10 meters
      if (!course.lat || !course.lng || latDiff > 0.0001 || lngDiff > 0.0001) {
        await storage.updateCourse(course.id, { lat: coords.lat, lng: coords.lng });
        updated++;
      }
    }
    if (updated > 0) {
      console.log(`[seed] Updated coordinates for ${updated} courses from verified CSV data`);
    }
    return;
  }

  let inserted = 0;
  for (const c of CSV_COURSES) {
    try {
      const coords = GEOCODED_COORDS[c.name];
      await storage.createCourse({
        name: c.name,
        address: c.address ?? undefined,
        city: c.city,
        region: c.region,
        lat: coords?.lat,
        lng: coords?.lng,
        tags: buildTags(c),
        feeNote: buildFeeNote(c) ?? undefined,
        website: normalizeWebsite(c.website) ?? undefined,
        phone: c.phone ?? undefined,
        isActive: true,
      });
      inserted++;
    } catch (err) {
      console.error("[seed] Failed to insert course:", c.name, err);
    }
  }
  if (inserted > 0) {
    console.log(`[seed] Inserted ${inserted} courses from CSV with pre-geocoded coordinates`);
  }
}
