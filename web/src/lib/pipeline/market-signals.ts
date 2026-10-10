// Research agent output, 2026-10-10. Public sources only; every signal links its sources.
import type { MarketSignal } from "./types";

export const MARKET_SIGNALS: MarketSignal[] = [
  {
    id: "S01",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["EU"],
    title: "Physical buttons are back",
    category: "Interior",
    detail:
      "Euro NCAP 2026 rewards physical horn, indicator, hazard and wiper controls; required score share rises to 80% by 2028.",
    relatesTo: ["Easier everyday vehicle functions", "Simpler iDrive menus and touchscreen"],
    strength: "strong",
    sources: [
      {
        label: "Euro NCAP: 2026 protocol changes",
        url: "https://www.euroncap.com/press-media/euro-ncap-announces-2026-protocol-changes-to-tackle-modern-driving-risks/",
      },
      {
        label: "Autocar India: Euro NCAP to penalise cars without buttons",
        url: "https://www.autocarindia.com/car-news/euro-ncap-to-penalise-cars-without-essential-physical-buttons-from-2026-438013",
      },
    ],
  },
  {
    id: "S02",
    kind: "competitor",
    series: ["F70"],
    markets: ["EU"],
    title: "Real buttons on the wheel",
    competitor: "VW Golf",
    category: "Interior",
    detail:
      "Golf facelift (2024) swapped criticised touch sliders for physical steering-wheel buttons after customer complaints.",
    relatesTo: ["Easier everyday vehicle functions"],
    strength: "strong",
    sources: [
      {
        label: "Motor1: The return of buttons in cars",
        url: "https://www.motor1.com/news/711906/physical-button-return-in-cars/",
      },
      {
        label: "Car Enthusiast: facelifted Golf brings back buttons",
        url: "https://www.carenthusiast.com/news/article/13677/Volkswage/2024-Volkswagen-Golf/VW+reveals+facelifted+Golf+GTI+Clubsport.html",
      },
    ],
  },
  {
    id: "S03",
    kind: "trend",
    series: ["G60", "G70"],
    markets: ["US"],
    title: "Touchscreens top quality complaints",
    category: "Digital",
    detail:
      "J.D. Power 2025 IQS: infotainment is the most problematic category (42.6 PP100); moving climate onto screens adds problems.",
    relatesTo: [
      "Faster, more stable infotainment",
      "Simpler iDrive menus and touchscreen",
      "Stronger climate control with easy controls",
    ],
    strength: "strong",
    sources: [
      {
        label: "J.D. Power 2025 U.S. Initial Quality Study",
        url: "https://www.jdpower.com/business/press-releases/2025-us-initial-quality-study-iqs/",
      },
    ],
  },
  {
    id: "S04",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["US", "EU"],
    title: "Phone mirroring is a deal-breaker",
    category: "Digital",
    detail:
      "38% of US ICE buyers reject cars without CarPlay/Android Auto; smartphone connectivity is the top tech fault (8.4 PP100).",
    relatesTo: ["Better phone connectivity (CarPlay, Bluetooth)"],
    strength: "strong",
    sources: [
      {
        label: "9to5Mac: McKinsey survey on CarPlay as must-have",
        url: "https://9to5mac.com/2024/06/20/carplay-must-have-survey-results/",
      },
      {
        label: "The Drive: J.D. Power 2025 Vehicle Dependability Study",
        url: "https://www.thedrive.com/news/surprise-new-tech-is-making-cars-less-dependable-j-d-power",
      },
    ],
  },
  {
    id: "S05",
    kind: "competitor",
    series: ["F70", "G60", "G70"],
    markets: ["EU", "US"],
    title: "Conversational AI voice assistant",
    competitor: "Mercedes CLA / MBUX Virtual Assistant",
    category: "Digital",
    detail:
      "MBUX Virtual Assistant blends ChatGPT-4o, Bing and Gemini; explains car functions and finds places in natural conversation.",
    relatesTo: [
      "Easier everyday vehicle functions",
      "Clearer owner's manual and in-car help",
      "Smarter navigation and route planning",
    ],
    strength: "emerging",
    sources: [
      {
        label: "InsideEVs: Mercedes CLA AI assistant review",
        url: "https://insideevs.com/news/782831/mercedes-cla-ai-assistant-review/",
      },
      {
        label: "J.D. Power: 2026 Mercedes-Benz CLA review",
        url: "https://www.jdpower.com/cars/expert-reviews/2026-mercedes-benz-cla-with-eq-technology-review",
      },
    ],
  },
  {
    id: "S06",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["CN"],
    title: "LLM assistants in Chinese cockpits",
    category: "Digital",
    detail:
      "Within weeks of February 2025, Zeekr, Voyah, Geely and BYD wired DeepSeek models into cockpits and driver assistance.",
    relatesTo: ["Easier everyday vehicle functions"],
    strength: "emerging",
    sources: [
      {
        label: "CnEVPost: Zeekr, M-Hero integrate DeepSeek",
        url: "https://cnevpost.com/2025/02/08/zeekr-dongfeng-m-hero-integrate-deepseek/",
      },
      {
        label: "CNBC: BYD driver assist with DeepSeek",
        url: "https://www.cnbc.com/2025/02/11/byd-rolls-out-driver-assist-tech-for-evs-with-deepseeks-ai-help.html",
      },
    ],
  },
  {
    id: "S07",
    kind: "competitor",
    series: ["G60"],
    markets: ["CN"],
    title: "Phone and smart-home ecosystem",
    competitor: "Xiaomi SU7",
    category: "Digital",
    detail:
      "Phone apps float on the car screen at 60 fps; car links to 1,000+ Xiaomi smart-home devices.",
    relatesTo: ["Better phone connectivity (CarPlay, Bluetooth)"],
    strength: "strong",
    sources: [
      {
        label: "Digital Trends: Xiaomi SU7 features every car needs",
        url: "https://www.digitaltrends.com/cars/i-sat-in-the-xiaomi-su7-max-here-are-5-features-that-every-car-needs/",
      },
      {
        label: "MotorTrend: Xiaomi SU7 first drive",
        url: "https://www.motortrend.com/reviews/first-drive-2027-xiaomi-su7-china",
      },
    ],
  },
  {
    id: "S08",
    kind: "competitor",
    series: ["G60"],
    markets: ["US"],
    title: "Best-rated companion app",
    competitor: "Tesla Model 3 / Model S",
    category: "Digital",
    detail:
      "J.D. Power 2026 EV app report: Tesla 867, My BMW 832; 79% of Tesla owners use the app every drive.",
    relatesTo: ["A more reliable My BMW app"],
    strength: "strong",
    sources: [
      {
        label: "J.D. Power 2026 U.S. OEM EV App Report",
        url: "https://www.jdpower.com/business/press-releases/2026-us-oem-ev-app-report/",
      },
      {
        label: "J.D. Power 2025 U.S. OEM EV App Report",
        url: "https://www.jdpower.com/business/press-releases/2025-us-oem-ev-app-report",
      },
    ],
  },
  {
    id: "S09",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["EU", "US", "CN"],
    title: "Connected cars, uneven OTA payoff",
    category: "Digital",
    detail:
      "83% of new cars sold in 2025 had embedded telematics, yet 56% of owners saw no gain from OTA updates.",
    relatesTo: ["Working eSIM and in-car Wi-Fi", "Faster, more stable infotainment"],
    strength: "strong",
    sources: [
      {
        label: "Berg Insight: Global Automotive OEM Telematics Market (summary)",
        url: "https://www.giiresearch.com/report/ber2092376-global-automotive-oem-telematics-market-11th.html",
      },
      {
        label: "The Drive: J.D. Power 2025 Vehicle Dependability Study",
        url: "https://www.thedrive.com/news/surprise-new-tech-is-making-cars-less-dependable-j-d-power",
      },
    ],
  },
  {
    id: "S10",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["US", "EU"],
    title: "Subscription fatigue",
    category: "Digital",
    detail:
      "76% of US/EU drivers skip connected-service subscriptions; 92% expect heated seats included in the purchase price.",
    relatesTo: ["More standard equipment for the price"],
    strength: "strong",
    sources: [
      {
        label: "The Drive: 76% of drivers say no to subscriptions (2025)",
        url: "https://www.thedrive.com/news/76-percent-of-drivers-are-saying-no-to-automakers-grubby-subscription-services-study",
      },
      {
        label: "Cox Automotive: buyers balk at monthly fees",
        url: "https://www.coxautoinc.com/insights/car-buyers-balk-at-paying-monthly-fees-for-features-and-services/",
      },
    ],
  },
  {
    id: "S11",
    kind: "trend",
    series: ["G60", "G70"],
    markets: ["US"],
    title: "Hands-free highway driving wanted",
    category: "Digital",
    detail:
      "AutoPacific 2025: hands-off highway assist is the top-wanted feature at 43% of intenders, up 20 points in a year.",
    relatesTo: ["Smarter, less intrusive driver assistance"],
    strength: "strong",
    sources: [
      {
        label: "AutoPacific: Future Attribute Demand Study 2025",
        url: "https://www.autopacific.com/autopacificinsights/kwkgqku4xvpw2cg6hlo43iyl3gvudl",
      },
      {
        label: "InsideEVs: the most wanted feature in new cars",
        url: "https://insideevs.com/news/767032/hands-free-driving-feature-study/",
      },
    ],
  },
  {
    id: "S12",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["CN"],
    title: "Urban NOA goes mainstream",
    category: "Digital",
    detail:
      "CAAM: 3.13 million cars with city NOA sold Jan–Nov 2025, 15.1% penetration, up 5.6 points.",
    relatesTo: ["Smarter, less intrusive driver assistance"],
    strength: "strong",
    sources: [
      {
        label: "People's Daily: CAAM 2025 City NOA report",
        url: "http://finance.people.com.cn/n1/2026/0115/c1004-40645896.html",
      },
      {
        label: "ChinaEVHome: City NOA sales surpass 3.12M",
        url: "https://chinaevhome.com/2026/01/14/chinas-2025-city-noa-vehicle-sales-surpass-3-12m-units-market-reach-at-15-1/",
      },
    ],
  },
  {
    id: "S13",
    kind: "competitor",
    series: ["G70"],
    markets: ["EU"],
    title: "Eyes-off Level 3 driving",
    competitor: "Mercedes S-Class / EQS Drive Pilot",
    category: "Digital",
    detail:
      "Drive Pilot approved for Level 3 up to 95 km/h on German Autobahns; option from €5,950.",
    relatesTo: ["Smarter, less intrusive driver assistance"],
    strength: "emerging",
    sources: [
      {
        label: "Mercedes-Benz Group: Drive Pilot 95 km/h",
        url: "https://group.mercedes-benz.com/technology/autonomous-driving/driving/drive-pilot-95-kmh.html",
      },
      {
        label: "TÜV Rheinland: approval up to 95 km/h",
        url: "https://www.tuv.com/press/en/press-releases/automated-lane-keeping-system.html",
      },
    ],
  },
  {
    id: "S14",
    kind: "competitor",
    series: ["G60"],
    markets: ["EU", "US"],
    title: "Long range, 21-minute fast charge",
    competitor: "Audi A6 e-tron",
    category: "Powertrain",
    detail:
      "800 V platform: up to 750 km WLTP and 270 kW charging, 10–80% in 21 minutes.",
    relatesTo: ["More real-world electric range", "Easier, more reliable charging"],
    strength: "strong",
    sources: [
      {
        label: "electrive: Audi A6 Sportback e-tron review",
        url: "https://www.electrive.com/2025/09/04/audi-a6-sportback-e-tron-review-the-electric-audi-everyone-has-been-waiting-for/",
      },
      {
        label: "Autocar: Audi A6 e-tron review",
        url: "https://www.autocar.co.uk/car-review/audi/a6-e-tron",
      },
    ],
  },
  {
    id: "S15",
    kind: "competitor",
    series: ["F70"],
    markets: ["EU"],
    title: "Class-leading efficiency and range",
    competitor: "Mercedes CLA (electric)",
    category: "Powertrain",
    detail:
      "CLA 250+: 792 km WLTP at 12.2 kWh/100 km, 320 kW peak charging via 800 V.",
    relatesTo: ["More real-world electric range", "More responsive, efficient powertrain"],
    strength: "strong",
    sources: [
      {
        label: "InsideEVs: Mercedes CLA EV first drive",
        url: "https://insideevs.com/reviews/766096/mercedes-cla-ev-first-drive/",
      },
      {
        label: "Autocar: Mercedes CLA Electric road test",
        url: "https://www.autocar.co.uk/car-review/mercedes-benz/cla-electric",
      },
    ],
  },
  {
    id: "S16",
    kind: "trend",
    series: ["G60", "G70"],
    markets: ["CN"],
    title: "Megawatt charging in China",
    category: "Powertrain",
    detail:
      "BYD's 1,000 kW platform adds 400 km in 5 minutes; 4,000+ matching chargers planned across China.",
    relatesTo: ["Easier, more reliable charging"],
    strength: "emerging",
    sources: [
      {
        label: "Reuters: BYD unveils super-charging EV tech",
        url: "https://www.reuters.com/business/autos-transportation/chinas-byd-unveils-faster-charging-ev-platform-aims-build-over-4000-charging-2025-03-17/",
      },
      {
        label: "BYD: Super e-Platform press release",
        url: "https://www.byd.com/en/news-list/BYD-Unveils-Super-e-Platform-Megawatt-Flash-Charging-Electric-Vehicles-Matching-Refueling-Speeds",
      },
    ],
  },
  {
    id: "S17",
    kind: "competitor",
    series: ["G60", "G70"],
    markets: ["CN"],
    title: "Battery swap network at scale",
    competitor: "NIO ET5 / ET7 / ET9",
    category: "Powertrain",
    detail:
      "3,655 swap stations in China, 1,008 on highways; about 97,000 swaps a day in mid-2025.",
    relatesTo: ["Easier, more reliable charging"],
    strength: "strong",
    sources: [
      {
        label: "CnEVPost: Nio swap stations in Shanghai surpass 200",
        url: "https://cnevpost.com/2025/12/29/nio-swap-stations-shanghai-surpass-200/",
      },
      {
        label: "CnEVPost: Nio reaches 80 million swaps",
        url: "https://cnevpost.com/2025/07/19/nio-80-million-battery-swap-milestone/",
      },
    ],
  },
  {
    id: "S18",
    kind: "trend",
    series: ["G60", "G70"],
    markets: ["CN"],
    title: "Plug-in hybrids and EREVs hold",
    category: "Powertrain",
    detail:
      "2025 China retail: 4.57M PHEVs/EREVs, about 36% of NEVs; growth 6–9% versus 24% for BEVs.",
    relatesTo: ["More responsive, efficient powertrain"],
    strength: "strong",
    sources: [
      {
        label: "CnEVPost: China Dec 2025 NEV retail record",
        url: "https://cnevpost.com/2026/01/09/china-dec-2025-nev-retail-record-high/",
      },
    ],
  },
  {
    id: "S19",
    kind: "competitor",
    series: ["G60"],
    markets: ["US"],
    title: "Most trusted fast-charging network",
    competitor: "Tesla Supercharger",
    category: "Powertrain",
    detail:
      "Superchargers top J.D. Power DC satisfaction for a fifth year (709); 14% of public charging visits still fail.",
    relatesTo: ["Easier, more reliable charging"],
    strength: "strong",
    sources: [
      {
        label: "J.D. Power 2025 EVX Public Charging Study",
        url: "https://www.jdpower.com/business/press-releases/2025-us-electric-vehicle-experience-evx-public-charging-study",
      },
      {
        label: "Autoblog: Tesla's network, rivals catching up",
        url: "https://www.autoblog.com/news/teslas-charging-network-competition-from-ford-and-rivian",
      },
    ],
  },
  {
    id: "S20",
    kind: "competitor",
    series: ["G70"],
    markets: ["CN"],
    title: "Zero-gravity rear seats",
    competitor: "Maextro S800",
    category: "Interior",
    detail:
      "Rear seats recline 148.5° with massage and fridge; outsold 7 Series/i7 5,465 to 2,976 in Jan–Apr 2026.",
    relatesTo: ["More comfortable, better-equipped seats"],
    strength: "strong",
    sources: [
      {
        label: "CarNewsChina: Maextro S800 launched",
        url: "https://carnewschina.com/2025/05/30/maextro-s800-launched-as-maybach-challenger-starting-at-97500-usd-in-china/",
      },
      {
        label: "CarNewsChina: S800 leads, BMW drops to #5",
        url: "https://carnewschina.com/2026/05/13/maextro-s800-continues-chinas-ultra-luxury-sedan-dominance-as-bmw-drops-to-5/",
      },
    ],
  },
  {
    id: "S21",
    kind: "competitor",
    series: ["G60"],
    markets: ["CN"],
    title: "Long-wheelbase rear comfort",
    competitor: "Mercedes E-Class L",
    category: "Interior",
    detail:
      "China-only E-Class L: 133 mm longer wheelbase, rear seats recline 36°, electric leg rests, neck heating.",
    relatesTo: ["More comfortable, better-equipped seats"],
    strength: "strong",
    sources: [
      {
        label: "Mercedes-Benz: E-Class L long wheelbase specs",
        url: "https://mercedes-world.com/e-class/mercedes-benz-e-class-l-long-wheelbase-specs-pictures",
      },
      {
        label: "Carscoops: E-Class L debuts in China",
        url: "https://www.carscoops.com/2023/10/2024-mercedes-e-class-l-debuts-in-china-with-extra-amenities-for-the-rear-passengers/",
      },
    ],
  },
  {
    id: "S22",
    kind: "competitor",
    series: ["G70"],
    markets: ["CN"],
    title: "Rear fridge and four-zone climate",
    competitor: "Yangwang U7",
    category: "Interior",
    detail:
      "Rear passengers get massage, four-zone climate and a fridge cooling to -6°C or heating to 50°C.",
    relatesTo: ["More comfortable, better-equipped seats", "Stronger climate control with easy controls"],
    strength: "emerging",
    sources: [
      {
        label: "EV Web: Yangwang U7 first look",
        url: "https://electricvehicleweb.com/yangwang-u7/",
      },
    ],
  },
  {
    id: "S23",
    kind: "competitor",
    series: ["G70"],
    markets: ["CN"],
    title: "Active suspension reads the road",
    competitor: "NIO ET9",
    category: "Powertrain",
    detail:
      "SkyRide active suspension pre-lifts wheels over cloud-mapped bumps; steer-by-wire and rear steer give a 10.9 m turning circle.",
    relatesTo: ["Better ride comfort and handling balance"],
    strength: "emerging",
    sources: [
      {
        label: "MotorTrend: Nio ET9 first drive",
        url: "https://www.motortrend.com/reviews/nio-et9-china-s-class-sedan-first-drive-review",
      },
      {
        label: "InsideEVs: Nio ET9 review",
        url: "https://insideevs.com/reviews/767809/nio-et9-video-review-china/",
      },
    ],
  },
  {
    id: "S24",
    kind: "competitor",
    series: ["G70"],
    markets: ["US", "EU"],
    title: "Benchmark rear-seat serenity",
    competitor: "Mercedes S-Class",
    category: "Interior",
    detail:
      "Editors' Choice for ride, reclining massage rear seats and finish; Edmunds rates it quieter and fresher than the 7 Series.",
    relatesTo: [
      "More comfortable, better-equipped seats",
      "Better ride comfort and handling balance",
      "Higher-quality interior finish",
    ],
    strength: "strong",
    sources: [
      {
        label: "Car and Driver: 2025 Mercedes-Benz S-Class review",
        url: "https://www.caranddriver.com/mercedes-benz/s-class-2025",
      },
      {
        label: "Edmunds: S 580e road trip review",
        url: "https://www.edmunds.com/car-news/2025-mercedes-benz-s-580e-road-trip-review.html",
      },
    ],
  },
  {
    id: "S25",
    kind: "competitor",
    series: ["G60", "G70"],
    markets: ["US"],
    title: "Reliability and build quality",
    competitor: "Lexus LS / ES",
    category: "Interior",
    detail:
      "Consumer Reports 2025: Lexus 3rd for reliability (60), BMW 5th (58); LS praised for assembly quality and quiet cabin.",
    relatesTo: ["Higher-quality interior finish"],
    strength: "strong",
    sources: [
      {
        label: "Kelley Blue Book: Consumer Reports 2025 reliability ranking",
        url: "https://www.kbb.com/car-news/consumer-reports-toyota-subaru-make-the-most-reliable-cars/",
      },
      {
        label: "Consumer Guide: Lexus LS 500h test drive",
        url: "https://blog.consumerguide.com/test-drive-2023-lexus-ls-500h/",
      },
    ],
  },
  {
    id: "S26",
    kind: "competitor",
    series: ["G60", "G70"],
    markets: ["US"],
    title: "Warranty and standard luxury",
    competitor: "Genesis G80 / G90",
    category: "Interior",
    detail:
      "10-year/100,000-mile powertrain warranty, 3 years free maintenance; G90 has power doors and massage seats standard.",
    relatesTo: ["More standard equipment for the price", "Doors that open and close easily"],
    strength: "strong",
    sources: [
      {
        label: "Car and Driver: 2026 Genesis G80 review",
        url: "https://www.caranddriver.com/genesis/g80",
      },
      {
        label: "Car and Driver: Genesis G90 review",
        url: "https://www.caranddriver.com/genesis/g90-2023",
      },
    ],
  },
  {
    id: "S27",
    kind: "competitor",
    series: ["F70"],
    markets: ["EU"],
    title: "Lots of kit as standard",
    competitor: "MG4 / BYD Seal",
    category: "Interior",
    detail:
      "MG4 at £29,995 includes 360° camera, heated seats and wireless charging; Seal adds ventilated seats, heat pump.",
    relatesTo: ["More standard equipment for the price"],
    strength: "strong",
    sources: [
      {
        label: "CAR magazine: MG4 EV review (2026)",
        url: "https://www.carmagazine.co.uk/car-reviews/mg/4-ev-hatchback/",
      },
      {
        label: "What Car?: BYD Seal review",
        url: "https://www.whatcar.com/byd/seal/saloon/review/n26074",
      },
    ],
  },
  {
    id: "S28",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["CN"],
    title: "Hidden door handles banned",
    category: "Exterior",
    detail:
      "From 1 January 2027, every door needs a mechanical exterior and interior release; approved models by 2029.",
    relatesTo: ["Doors that open and close easily"],
    strength: "strong",
    sources: [
      {
        label: "Reuters: China to ban hidden car door handles",
        url: "https://www.reuters.com/world/asia-pacific/china-ban-hidden-car-door-handles-address-safety-fears-2026-02-03/",
      },
      {
        label: "CBS News: ban starting in 2027",
        url: "https://www.cbsnews.com/news/china-hidden-door-handles-cars-ban-starting-2027-safety-concerns/",
      },
    ],
  },
  {
    id: "S29",
    kind: "trend",
    series: ["G60", "G70"],
    markets: ["US"],
    title: "Sunroofs stay highly wanted",
    category: "Exterior",
    detail:
      "AutoPacific 2025: sunroofs rank third among most-wanted features, behind hands-free driving and rear auto braking.",
    relatesTo: ["Opening panoramic roof with better shading"],
    strength: "strong",
    sources: [
      {
        label: "Autoweek: the features car buyers demand most",
        url: "https://www.autoweek.com/news/a65988596/features-car-buyers-demand-most/",
      },
    ],
  },
  {
    id: "S30",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["EU"],
    title: "Drivers want a spare wheel",
    category: "Exterior",
    detail:
      "82% of AA members prefer a spare to an inflation kit; wheels feature in 22% of UK pothole repairs.",
    relatesTo: ["Tougher wheels and a spare-tyre option"],
    strength: "strong",
    sources: [
      {
        label: "The AA: Four fifths prefer a spare",
        url: "https://www.theaa.com/about-us/newsroom/four-fifths-prefer-a-spare",
      },
      {
        label: "Kwik Fit: cost of pothole damage rises to £1.7bn",
        url: "https://www.kwik-fit.com/press/cost-of-pothole-damage-rises-reversing-two-year-drop",
      },
    ],
  },
  {
    id: "S31",
    kind: "trend",
    series: ["G60", "G70"],
    markets: ["US"],
    title: "Tariffs push luxury prices up",
    category: "Interior",
    detail:
      "25% US import tariff since April 2025; Cox expected 10–15% rises on affected cars; BMW raised prices 1.9%.",
    relatesTo: ["More standard equipment for the price"],
    strength: "strong",
    sources: [
      {
        label: "Reuters: US car buyers face higher prices under tariffs",
        url: "https://www.reuters.com/business/autos-transportation/us-car-buyers-face-higher-prices-less-choice-under-trumps-tariffs-2025-03-28/",
      },
      {
        label: "Kelley Blue Book: tracking car prices during tariffs",
        url: "https://www.kbb.com/car-news/tariff-car-price-changes/",
      },
    ],
  },
  {
    id: "S32",
    kind: "trend",
    series: ["F70", "G60", "G70"],
    markets: ["US", "EU"],
    title: "Google built-in and Gemini",
    category: "Digital",
    detail:
      "50+ models ship Google built-in, 250M cars support Android Auto; Gemini replaces Google Assistant in both.",
    relatesTo: ["Smarter navigation and route planning", "Better phone connectivity (CarPlay, Bluetooth)"],
    strength: "emerging",
    sources: [
      {
        label: "Google: Gemini for cars",
        url: "https://blog.google/products-and-platforms/platforms/android/gemini-for-cars/",
      },
      {
        label: "Android Authority: Gemini for Android Auto and Google built-in",
        url: "https://www.androidauthority.com/gemini-android-auto-cars-with-google-built-in-3557024/",
      },
    ],
  },
];
