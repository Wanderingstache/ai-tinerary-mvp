// Sample trip used by the single-file preview: a couple in Rome, their answers, the research the
// AI steps would have returned, and the finished itinerary. Sample content only, not live research.
export default {
 "research": {
  "sights": {
   "status": "done",
   "result": {
    "sights": [
     {
      "name": "Colosseum",
      "why": "The arena that defines ancient Rome.",
      "time_needed": "2–3 hours",
      "book_ahead": true
     },
     {
      "name": "Roman Forum & Palatine Hill",
      "why": "The ruins of the old city center, with the best views.",
      "time_needed": "2 hours",
      "book_ahead": true
     },
     {
      "name": "Pantheon",
      "why": "The best-preserved ancient building in the city.",
      "time_needed": "1 hour",
      "book_ahead": true
     },
     {
      "name": "Vatican Museums & Sistine Chapel",
      "why": "One of the great art collections anywhere.",
      "time_needed": "4–5 hours",
      "book_ahead": true
     },
     {
      "name": "St. Peter's Basilica",
      "why": "Free to enter; the dome climb is extra.",
      "time_needed": "1–2 hours",
      "book_ahead": false
     },
     {
      "name": "Galleria Borghese",
      "why": "Bernini's best work in a villa setting; small timed slots.",
      "time_needed": "2 hours",
      "book_ahead": true
     },
     {
      "name": "Trevi Fountain",
      "why": "Best early or late, when the crowds thin.",
      "time_needed": "20 minutes",
      "book_ahead": false
     },
     {
      "name": "Piazza Navona",
      "why": "Baroque fountains and people-watching.",
      "time_needed": "30 minutes",
      "book_ahead": false
     },
     {
      "name": "Castel Sant'Angelo",
      "why": "A mausoleum turned fortress, with rooftop views.",
      "time_needed": "1–2 hours",
      "book_ahead": false
     },
     {
      "name": "Capitoline Museums",
      "why": "The world's oldest public museum, without Vatican crowds.",
      "time_needed": "2 hours",
      "book_ahead": false
     }
    ],
    "neighborhoods": [
     {
      "name": "Monti",
      "character": "The old artisan quarter, quieter and cheaper than the sights next door."
     },
     {
      "name": "Trastevere",
      "character": "Cobblestones, trattorias and a lively evening scene."
     },
     {
      "name": "Centro Storico",
      "character": "The walkable heart, packed with piazzas and churches."
     },
     {
      "name": "Prati",
      "character": "Local, orderly, and close to the Vatican."
     },
     {
      "name": "Testaccio",
      "character": "The food neighborhood, where Romans actually eat."
     }
    ],
    "day_trips": []
   },
   "at": "2026-09-28T15:36:16.255524Z"
  },
  "budget": {
   "status": "done",
   "result": {
    "currency": "EUR",
    "cost_level": "Rome is moderately expensive: pricier than most of Italy, cheaper than Paris or London.",
    "tiers": {},
    "notes": [
     "A city tax of a few euros per person per night is added at hotels.",
     "A small cover charge (coperto) is normal at sit-down restaurants."
    ]
   },
   "at": "2026-09-28T15:36:16.255524Z"
  },
  "pricing": {
   "status": "done",
   "result": {
    "verified_on": "2026-09-28",
    "failed": [],
    "currency": "EUR",
    "hotels": {
     "per_night_per_room": {
      "backpacker": {
       "low": 35,
       "high": 70
      },
      "tourist": {
       "low": 80,
       "high": 130
      },
      "three_star": {
       "low": 130,
       "high": 210
      },
      "four_star": {
       "low": 220,
       "high": 380
      },
      "five_star": {
       "low": 450,
       "high": 900
      }
     },
     "examples": [],
     "notes": []
    },
    "food": {
     "food_per_person_per_day": {
      "backpacker": {
       "low": 20,
       "high": 35
      },
      "tourist": {
       "low": 35,
       "high": 55
      },
      "three_star": {
       "low": 60,
       "high": 95
      },
      "four_star": {
       "low": 100,
       "high": 160
      },
      "five_star": {
       "low": 180,
       "high": 320
      }
     },
     "typical": {},
     "notes": []
    },
    "acts": {
     "activities_per_person_per_day": {
      "backpacker": {
       "low": 10,
       "high": 20
      },
      "tourist": {
       "low": 20,
       "high": 35
      },
      "three_star": {
       "low": 35,
       "high": 60
      },
      "four_star": {
       "low": 60,
       "high": 110
      },
      "five_star": {
       "low": 110,
       "high": 250
      }
     },
     "key_prices": [],
     "free_highlights": [],
     "notes": []
    },
    "transit": {
     "transport_per_person_per_day": {
      "backpacker": {
       "low": 3,
       "high": 6
      },
      "tourist": {
       "low": 6,
       "high": 10
      },
      "three_star": {
       "low": 8,
       "high": 15
      },
      "four_star": {
       "low": 25,
       "high": 60
      },
      "five_star": {
       "low": 120,
       "high": 300
      }
     },
     "key_prices": [],
     "notes": [
      "Private transport is priced per vehicle, then split between two travelers."
     ]
    },
    "context": {
     "season": "Shoulder season, with fewer crowds than summer",
     "weather": "Cool and mild, with some rain likely",
     "crowds": "Moderate. The Vatican and Colosseum still book out.",
     "events": [],
     "closures_or_warnings": [
      "The Vatican Museums are closed on Sundays"
     ],
     "walkability": "Cobblestones and uneven pavement almost everywhere. Expect a lot of walking; buses cover the longer distances. If you need specific accessibility accommodations, check with local transit authorities or accessibility organizations before you go.",
     "booking_advice": "Book timed entry for the Colosseum, Vatican and Galleria Borghese 3–4 weeks ahead."
    },
    "daily_estimate": {
     "backpacker": {
      "low": 51,
      "high": 96
     },
     "tourist": {
      "low": 101,
      "high": 165
     },
     "three_star": {
      "low": 168,
      "high": 275
     },
     "four_star": {
      "low": 295,
      "high": 520
     },
     "five_star": {
      "low": 635,
      "high": 1320
     }
    }
   },
   "at": "2026-09-28T15:36:16.255524Z"
  },
  "tiles": {
   "status": "done",
   "result": {
    "tiles": [
     {
      "label": "Colosseum",
      "why": ""
     },
     {
      "label": "Trastevere dinner",
      "why": ""
     },
     {
      "label": "Vatican Museums",
      "why": ""
     },
     {
      "label": "Galleria Borghese",
      "why": ""
     },
     {
      "label": "Sunset from the Gianicolo",
      "why": ""
     },
     {
      "label": "Testaccio food walk",
      "why": ""
     },
     {
      "label": "Appian Way",
      "why": ""
     },
     {
      "label": "Pantheon",
      "why": ""
     }
    ]
   },
   "at": "2026-09-28T15:36:16.255524Z"
  },
  "review_check": {
   "status": "done",
   "result": {
    "must_dos": [
     {
      "item": "Colosseum",
      "for": [
       "Dana"
      ],
      "status": "book_ahead",
      "note": "Timed entry is required; book ahead.",
      "source_url": ""
     },
     {
      "item": "Trastevere dinner",
      "for": [
       "Dana"
      ],
      "status": "ok",
      "note": "",
      "source_url": ""
     },
     {
      "item": "Vatican Museums",
      "for": [
       "Jordan"
      ],
      "status": "book_ahead",
      "note": "Closed Sundays, so your dates work. Timed entry recommended.",
      "source_url": ""
     }
    ],
    "conflicts": [
     {
      "id": "c1",
      "summary": "Jordan wants a full day at the Vatican Museums (4–5 hours on foot), which is more walking than Dana's comfort level.",
      "involves": [
       "Dana",
       "Jordan"
      ],
      "suggested": "split_activity",
      "options": {
       "together": "A shorter Vatican highlights visit, about 3 hours, for both.",
       "split_activity": "Jordan does the full museums; Dana joins for St. Peter's and lunch.",
       "split_day": "Spend the morning apart and meet for lunch.",
       "drop": "Skip the Vatican."
      }
     }
    ]
   },
   "at": "2026-09-28T15:36:16.255524Z"
  },
  "needs": {
   "status": "done",
   "result": {
    "skipped": false,
    "access": null,
    "diet": {
     "restaurants": [],
     "allergy_card": [],
     "tips": [],
     "unverified": []
    }
   },
   "at": "2026-09-28T15:36:16.255524Z"
  }
 },
 "group_answers": {
  "tier": "three_star",
  "comfort": "Comfort matters, but adventure first",
  "transport_pref": "Public transit / walking",
  "research_mode": "mine_plus",
  "research_sites": {
   "general": [
    "Rick Steves"
   ],
   "dining": [
    "Eater",
    "Michelin Guide"
   ]
  },
  "loyalty": {
   "hotel": true,
   "hotel_programs": [
    "Marriott Bonvoy"
   ]
  },
  "needs_gate": "yes",
  "pace": "Mix of Both",
  "rest": [
   "Leisurely lunches & dinners",
   "Sleeping in"
  ],
  "must_do_cats": [
   "Major landmarks",
   "Local food scene"
  ],
  "must_avoid_cats": [
   "Early mornings"
  ],
  "been_before": "first",
  "concerns": [
   "Logistics",
   "Downtime"
  ]
 },
 "travelers": [
  {
   "id": "t1",
   "name": "Dana",
   "age": "55–64",
   "why": [
    "The Reminiscer",
    "Foodie"
   ],
   "how_spend": "Cost-Benefit",
   "how_plan": "Reliable Rover",
   "dining": "Local haunts",
   "interests": [
    "Food",
    "History",
    "Art"
   ],
   "must_dos": [
    {
     "label": "Colosseum",
     "priority": "must"
    },
    {
     "label": "Trastevere dinner",
     "priority": "must"
    }
   ],
   "pace_align": "Matches the group",
   "avoid": [
    "Crowds"
   ],
   "activity_level": "Moderate",
   "rhythm": "Somewhere in between",
   "solo_time": "A little",
   "food_adventure": "Open to trying things",
   "alcohol": "Enjoys wine/drinks",
   "diet": [
    "Gluten-free / Celiac"
   ],
   "gluten_answered": true,
   "gluten_level": "Restaurant must have GF certification",
   "needs_types": []
  },
  {
   "id": "t2",
   "name": "Jordan",
   "age": "55–64",
   "why": [
    "The Immersed"
   ],
   "how_spend": "Cost-Benefit",
   "how_plan": "Deep Diver",
   "dining": "Casual",
   "interests": [
    "Museums",
    "History",
    "Walking tours"
   ],
   "must_dos": [
    {
     "label": "Vatican Museums",
     "priority": "must"
    }
   ],
   "pace_align": "More activities / faster pace",
   "avoid": [],
   "activity_level": "High",
   "rhythm": "Early bird",
   "solo_time": "Yes, regularly",
   "food_adventure": "Eats anything",
   "alcohol": "Enjoys wine/drinks",
   "diet": [],
   "needs_types": []
  }
 ],
 "review": {
  "conflict_choices": {
   "c1": {
    "choice": "split_activity"
   }
  }
 },
 "itinerary": {
  "title": "Rome in 3 days: ancient sights, one great anniversary dinner",
  "summary": "Three days that pair the big ancient sights with long lunches and slower evenings. Jordan gets a full morning at the Vatican Museums while Dana takes a slower start, and you meet up at St. Peter's.",
  "notes": [
   {
    "title": "Getting around",
    "text": "If you need step-free routes or other accessibility accommodations, check with local transit authorities or accessibility organizations before you go."
   },
   {
    "title": "Allergies",
    "text": "We searched for restaurants with accommodations, but cannot guarantee food safety. Always inform restaurants of allergies directly."
   }
  ],
  "safety_notes": [
   {
    "title": "The 64 bus",
    "text": "The Termini–Vatican route is Rome's best-known pickpocket route, especially when packed. Keep bags zipped and in front."
   },
   {
    "title": "\"Free\" gladiator photos",
    "text": "Costumed gladiators near the Colosseum expect payment after a photo. Politely decline up front if you don't want one."
   }
  ],
  "stay": [
   {
    "name": "Boutique hotel near Monti (sample)",
    "note": "Monti. Walkable to the Colosseum, with quiet streets at night.",
    "price_level": "€€€",
    "price_estimate": "",
    "price_source": "",
    "price_shift_warning": false,
    "place_query": "Monti",
    "maps_url": "https://www.google.com/maps/search/?api=1&query=Monti%2C%20Rome%2C%20Italy",
    "booking_url": "",
    "booking_source": "",
    "link_status": "",
    "accessibility_note": "",
    "dietary_note": "",
    "loyalty_note": "Prefer Marriott Bonvoy? Look for properties near Via Veneto or Termini.",
    "verification_tier": "AI-ed",
    "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
   },
   {
    "name": "Hotel in Prati (sample)",
    "note": "Prati. Calmer and close to the Vatican.",
    "price_level": "€€€",
    "price_estimate": "",
    "price_source": "",
    "price_shift_warning": false,
    "place_query": "Prati",
    "maps_url": "https://www.google.com/maps/search/?api=1&query=Prati%2C%20Rome%2C%20Italy",
    "booking_url": "",
    "booking_source": "",
    "link_status": "",
    "accessibility_note": "",
    "dietary_note": "",
    "loyalty_note": "",
    "verification_tier": "AI-ed",
    "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
   }
  ],
  "days": [
   {
    "day": 1,
    "date": "2026-11-10",
    "title": "Ancient Rome",
    "areas": [
     "Colosseum",
     "Roman Forum",
     "Monti"
    ],
    "blocks": [
     {
      "time": "9:00–12:30",
      "title": "Colosseum, Roman Forum & Palatine Hill",
      "who": "Everyone",
      "description": "One combined ticket covers all three. Book an entry time for the Colosseum; the Forum and Palatine are more flexible.",
      "tags": [
       "Timed entry required"
      ],
      "transport": {
       "mode": "Walk",
       "why": "The three sites sit side by side.",
       "research_note": ""
      },
      "options": [
       {
        "name": "Colosseum, Forum & Palatine combined ticket",
        "note": "Timed entry for the Colosseum.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Colosseum",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Colosseum%2C%20Rome%2C%20Italy",
        "booking_url": "https://parcocolosseo.it/en/",
        "booking_source": "",
        "link_status": "official",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "12:30–14:00",
      "title": "Lunch in Monti",
      "who": "Everyone",
      "description": "Quieter and cheaper than the streets right at the Colosseum.",
      "tags": [
       "Walk-in"
      ],
      "options": [
       {
        "name": "Example Trattoria",
        "note": "A cozy spot with a gluten-free menu.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Example Trattoria",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Example%20Trattoria%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "Gluten-free menu available",
        "loyalty_note": "",
        "verification_tier": "Stached",
        "verification_voice": "We've been there — and loved it. This is the real thing.",
        "blog_link": "https://wanderingmustache.com/example-trattoria-monti"
       },
       {
        "name": "Ai Tre Scalini",
        "note": "A cozy enoteca, good for a lighter lunch.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Ai Tre Scalini",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Ai%20Tre%20Scalini%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "14:30–17:00",
      "title": "Capitoline Hill & Monti wandering",
      "who": "Everyone",
      "description": "Michelangelo designed the piazza, and the museums behind it hold the she-wolf bronze.",
      "tags": [
       "Walk-in"
      ],
      "options": [
       {
        "name": "Capitoline Museums",
        "note": "No timed entry needed.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Capitoline Museums",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Capitoline%20Museums%2C%20Rome%2C%20Italy",
        "booking_url": "https://www.museicapitolini.org/en",
        "booking_source": "",
        "link_status": "official",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "19:30",
      "title": "Dinner in Trastevere",
      "who": "Everyone",
      "description": "Cross the river for cobblestones and a better food-to-tourist ratio. Book ahead.",
      "tags": [
       "Book ahead"
      ],
      "options": [
       {
        "name": "Da Enzo al 29",
        "note": "Tiny and iconic. Book ahead.",
        "price_level": "€€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Da Enzo al 29",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Da%20Enzo%20al%2029%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "Confirm gluten-free options when you book",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       },
       {
        "name": "Osteria der Belli",
        "note": "Sardinian-leaning trattoria.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Osteria der Belli",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Osteria%20der%20Belli%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     }
    ]
   },
   {
    "day": 2,
    "date": "2026-11-11",
    "title": "Vatican & the river",
    "areas": [
     "Vatican",
     "Castel Sant'Angelo",
     "Campo de' Fiori"
    ],
    "blocks": [
     {
      "time": "9:00–13:00",
      "title": "Vatican Museums & St. Peter's",
      "who": "Everyone",
      "description": "Two paths this morning, then you meet at St. Peter's around noon.",
      "tags": [
       "Timed entry required"
      ],
      "options": [],
      "split": [
       {
        "who": [
         "Jordan"
        ],
        "title": "Full Vatican Museums visit",
        "description": "The whole route through to the Sistine Chapel. Enter at opening to beat the tour groups.",
        "options": [
         {
          "name": "Vatican Museums",
          "note": "Timed entry is mandatory.",
          "price_level": "€€",
          "price_estimate": "",
          "price_source": "",
          "price_shift_warning": false,
          "place_query": "Vatican Museums",
          "maps_url": "https://www.google.com/maps/search/?api=1&query=Vatican%20Museums%2C%20Rome%2C%20Italy",
          "booking_url": "https://www.museivaticani.va/",
          "booking_source": "",
          "link_status": "official",
          "accessibility_note": "",
          "dietary_note": "",
          "loyalty_note": "",
          "verification_tier": "AI-ed",
          "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
         }
        ]
       },
       {
        "who": [
         "Dana"
        ],
        "title": "Slow morning, then St. Peter's",
        "description": "Coffee, a short riverside walk, then meet Jordan at the basilica. The security line is shorter before noon.",
        "options": [
         {
          "name": "Sciascia Caffè",
          "note": "A historic café for a slow start.",
          "price_level": "€€",
          "price_estimate": "",
          "price_source": "",
          "price_shift_warning": false,
          "place_query": "Sciascia Caffè",
          "maps_url": "https://www.google.com/maps/search/?api=1&query=Sciascia%20Caff%C3%A8%2C%20Rome%2C%20Italy",
          "booking_url": "",
          "booking_source": "",
          "link_status": "",
          "accessibility_note": "",
          "dietary_note": "",
          "loyalty_note": "",
          "verification_tier": "AI-ed",
          "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
         }
        ]
       }
      ]
     },
     {
      "time": "13:00–14:30",
      "title": "Lunch near the Vatican",
      "who": "Everyone",
      "description": "Skip the tourist-menu places on Via della Conciliazione.",
      "tags": [
       "Walk-in"
      ],
      "options": [
       {
        "name": "Pizzarium Bonci",
        "note": "Pizza by the slice, sold by weight. No seats.",
        "price_level": "€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Pizzarium Bonci",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Pizzarium%20Bonci%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       },
       {
        "name": "Hostaria Dino e Toni",
        "note": "A small neighborhood trattoria.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Hostaria Dino e Toni",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Hostaria%20Dino%20e%20Toni%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "15:30–17:30",
      "title": "Castel Sant'Angelo & the river",
      "who": "Everyone",
      "description": "The best rooftop view of the dome without a hike.",
      "tags": [
       "Walk-in",
       "Rest time"
      ],
      "options": [
       {
        "name": "Castel Sant'Angelo",
        "note": "No advance booking usually needed.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Castel Sant'Angelo",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Castel%20Sant%27Angelo%2C%20Rome%2C%20Italy",
        "booking_url": "https://castelsantangelo.beniculturali.it/en/",
        "booking_source": "",
        "link_status": "official",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "20:00",
      "title": "Anniversary dinner near Campo de' Fiori",
      "who": "Everyone",
      "description": "A special table for your anniversary. Reserve well ahead.",
      "tags": [
       "Book ahead"
      ],
      "options": [
       {
        "name": "Roscioli",
        "note": "A famous salumeria-restaurant. Reserve weeks ahead.",
        "price_level": "€€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Roscioli",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Roscioli%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       },
       {
        "name": "Armando al Pantheon",
        "note": "Small and family-run. Reserve ahead.",
        "price_level": "€€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Armando al Pantheon",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Armando%20al%20Pantheon%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     }
    ]
   },
   {
    "day": 3,
    "date": "2026-11-12",
    "title": "Historic center & Villa Borghese",
    "areas": [
     "Borghese",
     "Spanish Steps",
     "Trevi",
     "Pantheon"
    ],
    "blocks": [
     {
      "time": "9:30",
      "title": "Galleria Borghese",
      "who": "Everyone",
      "description": "Strict two-hour slots that sell out. Bernini's Apollo and Daphne alone is worth it.",
      "tags": [
       "Timed entry required"
      ],
      "options": [
       {
        "name": "Galleria Borghese",
        "note": "Book well ahead.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Galleria Borghese",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Galleria%20Borghese%2C%20Rome%2C%20Italy",
        "booking_url": "https://galleriaborghese.beniculturali.it/en/",
        "booking_source": "",
        "link_status": "official",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "12:30–14:00",
      "title": "Lunch near Piazza del Popolo",
      "who": "Everyone",
      "description": "",
      "tags": [
       "Walk-in"
      ],
      "options": [
       {
        "name": "Il Margutta",
        "note": "A long-running vegetarian restaurant.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Il Margutta",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Il%20Margutta%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       },
       {
        "name": "Giolitti",
        "note": "A historic gelateria.",
        "price_level": "€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Giolitti",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Giolitti%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "14:30–18:00",
      "title": "Spanish Steps → Trevi → Pantheon → Piazza Navona",
      "who": "Everyone",
      "description": "One walkable loop through the headline sights. Go to Trevi in the early evening for better light.",
      "tags": [
       "Walk-in"
      ],
      "options": [
       {
        "name": "Trevi Fountain",
        "note": "Free.",
        "price_level": "Free",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Trevi Fountain",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Trevi%20Fountain%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       },
       {
        "name": "Pantheon",
        "note": "Small fee, timed entry.",
        "price_level": "€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Pantheon",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Pantheon%2C%20Rome%2C%20Italy",
        "booking_url": "https://www.pantheonroma.com/",
        "booking_source": "",
        "link_status": "official",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     },
     {
      "time": "19:30",
      "title": "Farewell dinner",
      "who": "Everyone",
      "description": "",
      "tags": [
       "Walk-in"
      ],
      "options": [
       {
        "name": "Cul de Sac",
        "note": "A historic wine bar with an enormous list.",
        "price_level": "€€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "Cul de Sac",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Cul%20de%20Sac%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       },
       {
        "name": "L'Insalata Ricca",
        "note": "Reliable and budget-friendly.",
        "price_level": "€",
        "price_estimate": "",
        "price_source": "",
        "price_shift_warning": false,
        "place_query": "L'Insalata Ricca",
        "maps_url": "https://www.google.com/maps/search/?api=1&query=L%27Insalata%20Ricca%2C%20Rome%2C%20Italy",
        "booking_url": "",
        "booking_source": "",
        "link_status": "",
        "accessibility_note": "",
        "dietary_note": "",
        "loyalty_note": "",
        "verification_tier": "AI-ed",
        "verification_voice": "Based on our research, this looks like a great fit. Check reviews before booking."
       }
      ]
     }
    ]
   }
  ],
  "useful_phrases": [
   {
    "phrase": "Il conto, per favore",
    "meaning": "The bill, please"
   },
   {
    "phrase": "Dov'è il bagno?",
    "meaning": "Where's the bathroom?"
   }
  ],
  "allergy_card": [
   {
    "for": "Dana",
    "local_text": "Ho la celiachia. Ho bisogno di cibo senza glutine, per favore.",
    "english": "I have celiac disease. I need gluten-free food, please."
   }
  ],
  "before_you_go": [
   "Book Colosseum, Vatican Museums and Galleria Borghese timed entry now.",
   "Reserve the anniversary dinner on Day 2 several weeks ahead.",
   "Carry a small crossbody bag and keep it zipped on buses."
  ],
  "generated_at": "2026-09-28T15:36:16.255524Z",
  "link_check": {
   "checked": 8,
   "error": null
  }
 }
};
