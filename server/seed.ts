import { storage } from "./storage";

const GTA_COURSES = [
  { name: "Angus Glen Golf Club", city: "Markham", region: "ON", lat: 43.8786, lng: -79.2999, website: "https://www.angusglen.com", phone: "905-887-0090", tags: ["championship", "36-holes"], feeNote: "$130-$200" },
  { name: "Lionhead Golf Club", city: "Brampton", region: "ON", lat: 43.6891, lng: -79.8215, website: "https://www.lionheadgolf.com", phone: "905-455-8400", tags: ["36-holes", "resort"], feeNote: "$75-$130" },
  { name: "Humber Valley Resort", city: "Brampton", region: "ON", lat: 43.7302, lng: -79.7856, website: "https://www.humbervalleygolf.com", phone: "905-451-3322", tags: ["resort", "18-holes"], feeNote: "$60-$100" },
  { name: "Rattlesnake Point Golf Club", city: "Milton", region: "ON", lat: 43.5281, lng: -79.8536, website: "https://www.rattlesnakepointgolf.com", phone: "905-876-2355", tags: ["18-holes"], feeNote: "$65-$95" },
  { name: "Glen Eagle Golf Club", city: "Caledon", region: "ON", lat: 43.7958, lng: -79.8685, website: "https://www.gleneaglegolf.com", phone: "905-857-5013", tags: ["18-holes"], feeNote: "$70-$100" },
  { name: "Wooden Sticks Golf Club", city: "Uxbridge", region: "ON", lat: 44.1089, lng: -79.1137, website: "https://www.woodensticks.com", phone: "905-852-4379", tags: ["unique", "18-holes"], feeNote: "$85-$140" },
  { name: "National Golf Club of Canada", city: "Woodbridge", region: "ON", lat: 43.8250, lng: -79.5849, website: "https://www.nationalgolfclub.com", phone: "905-851-8460", tags: ["private", "championship"], feeNote: "Members only" },
  { name: "Mississaugua Golf & Country Club", city: "Mississauga", region: "ON", lat: 43.5650, lng: -79.6190, website: "https://www.mississaugua.com", phone: "905-278-1600", tags: ["private", "historic"], feeNote: "Members only" },
  { name: "Osprey Valley Golf", city: "Caledon", region: "ON", lat: 44.0154, lng: -79.9278, website: "https://www.ospreyvalley.com", phone: "519-942-2808", tags: ["54-holes", "resort"], feeNote: "$90-$160" },
  { name: "TPC Toronto at Osprey Valley", city: "Caledon", region: "ON", lat: 44.0132, lng: -79.9274, website: "https://www.tpctoronto.com", phone: "519-942-2808", tags: ["championship", "tpc"], feeNote: "$160-$250" },
  { name: "Blue Springs Golf Club", city: "Acton", region: "ON", lat: 43.6312, lng: -80.0285, website: "https://www.bluespringsgolf.com", phone: "519-853-5322", tags: ["18-holes", "scenic"], feeNote: "$65-$90" },
  { name: "Granite Golf Club", city: "Stouffville", region: "ON", lat: 43.9847, lng: -79.2486, website: "https://www.granitegolf.ca", phone: "905-640-2424", tags: ["private", "18-holes"], feeNote: "Members only" },
  { name: "Cardinal Golf Club", city: "King City", region: "ON", lat: 43.9293, lng: -79.5319, website: "https://www.cardinalgolf.com", phone: "905-841-7378", tags: ["36-holes", "public"], feeNote: "$55-$80" },
  { name: "Copper Creek Golf Club", city: "Kleinburg", region: "ON", lat: 43.8729, lng: -79.6433, website: "https://www.coppercreek.ca", phone: "905-893-3900", tags: ["18-holes", "scenic"], feeNote: "$80-$120" },
  { name: "King Valley Golf Club", city: "King City", region: "ON", lat: 43.9318, lng: -79.5260, website: "https://www.kingvalley.com", phone: "905-833-5100", tags: ["18-holes", "resort"], feeNote: "$85-$130" },
  { name: "Brampton Golf Club", city: "Brampton", region: "ON", lat: 43.6895, lng: -79.7612, website: "https://www.bramptongolfclub.com", phone: "905-457-4121", tags: ["private", "historic"], feeNote: "Members only" },
  { name: "Cherry Downs Golf Club", city: "Pickering", region: "ON", lat: 43.8546, lng: -79.1358, website: "https://www.cherrydowns.com", phone: "905-683-1888", tags: ["public", "18-holes"], feeNote: "$55-$80" },
  { name: "Deer Creek Golf Club", city: "Ajax", region: "ON", lat: 43.8488, lng: -79.0355, website: "https://www.deercreekgolf.com", phone: "905-427-7737", tags: ["27-holes", "public"], feeNote: "$50-$75" },
  { name: "Whitby Shores Golf Club", city: "Whitby", region: "ON", lat: 43.8724, lng: -78.9458, website: "https://www.whitbyshoresgolf.com", phone: "905-430-2727", tags: ["18-holes", "public"], feeNote: "$50-$70" },
  { name: "Lakeridge Links", city: "Uxbridge", region: "ON", lat: 44.0967, lng: -79.1268, website: "https://www.lakeridgelinks.com", phone: "905-649-3013", tags: ["18-holes", "links-style"], feeNote: "$60-$85" },
  { name: "Eagle's Nest Golf Club", city: "Maple", region: "ON", lat: 43.8712, lng: -79.5218, website: "https://www.eaglesnestgolf.com", phone: "905-303-9229", tags: ["18-holes", "championship"], feeNote: "$90-$140" },
  { name: "Emerald Hills Golf Club", city: "Stouffville", region: "ON", lat: 43.9803, lng: -79.2521, website: "https://www.emeraldhillsgolf.com", phone: "905-640-6613", tags: ["27-holes", "public"], feeNote: "$60-$90" },
  { name: "Peninsula Lakes Golf Club", city: "Fenwick", region: "ON", lat: 43.0298, lng: -79.3628, website: "https://www.peninsulalakes.com", phone: "905-892-4020", tags: ["18-holes", "scenic"], feeNote: "$65-$95" },
  { name: "Midland Golf & Country Club", city: "Midland", region: "ON", lat: 44.7522, lng: -79.8879, website: "https://www.midlandgolf.ca", phone: "705-526-6671", tags: ["18-holes", "private"], feeNote: "Members only" },
  { name: "Carrying Place Golf & Country Club", city: "King Township", region: "ON", lat: 43.9637, lng: -79.6185, website: "https://www.carryingplace.com", phone: "905-833-5050", tags: ["private", "championship"], feeNote: "Members only" },
];

export async function seedGtaCourses(): Promise<void> {
  const existing = await storage.searchCourses();
  const existingNames = new Set(existing.map(c => c.name));
  let inserted = 0;
  for (const c of GTA_COURSES) {
    if (existingNames.has(c.name)) continue;
    try {
      await storage.createCourse({ ...c, isActive: true });
      inserted++;
    } catch (err) {
      console.error("[seed] Failed to insert course:", c.name, err);
    }
  }
  if (inserted > 0) {
    console.log(`[seed] Inserted ${inserted} GTA courses`);
  }
}
