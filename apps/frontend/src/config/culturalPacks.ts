import type { CulturalContentItem } from '../services/cultural/types';

export const CULTURAL_PACK_NER: CulturalContentItem[] = [
  // Assam
  {
    id: 'assam_bihu',
    region: 'Assam',
    contentLocaleSupport: ['en', 'as', 'hi', 'bn'],
    theme: 'Festivals',
    title: {
      en: 'Bohag Bihu',
      as: 'ব’হাগ বিহু',
      hi: 'बोहाग बिहू',
      bn: 'বোহাগ বিহু'
    },
    description: {
      en: 'Bohag Bihu marks the Assamese New Year.',
      as: 'ব’হাগ বিহু অসমীয়া নৱবৰ্ষৰ আৰম্ভণি।',
      hi: 'बोहाग बिहू असमिया नव वर्ष का प्रतीक है।',
      bn: 'বোহাগ বিহু অসমীয়া নববর্ষের সূচনা করে।'
    },
    prompt: {
      en: 'Do you remember celebrating Bihu with your family? What special food was prepared?',
      as: 'পৰিয়ালৰ সৈতে বিহু উদযাপন কৰা মনত পৰে নে? কি বিশেষ খাদ্য বনোৱা হৈছিল?',
      hi: 'क्या आपको अपने परिवार के साथ बिहू मनाना याद है? कौन सा विशेष भोजन तैयार किया गया था?',
      bn: 'আপনার কি পরিবারের সাথে বিহু উদযাপনের কথা মনে আছে? কী বিশেষ খাবার তৈরি করা হয়েছিল?'
    },
    tags: ['festival', 'spring', 'family'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  {
    id: 'assam_tea',
    region: 'Assam',
    contentLocaleSupport: ['en', 'as', 'hi', 'bn'],
    theme: 'Nature',
    title: {
      en: 'Assam Tea Gardens',
      as: 'অসমৰ চাহ বাগিচা',
      hi: 'असम के चाय बागान',
      bn: 'আসামের চা বাগান'
    },
    description: {
      en: 'Assam is famous for its lush green tea gardens.',
      as: 'অসম সেউজীয়া চাহ বাগিচাৰ বাবে বিখ্যাত।',
      hi: 'असम अपने हरे भरे चाय बागानों के लिए प्रसिद्ध है।',
      bn: 'আসাম সবুজ চা বাগানের জন্য বিখ্যাত।'
    },
    prompt: {
      en: 'Can you picture the green tea gardens? How do you like your morning tea?',
      as: 'সেউজীয়া চাহ বাগিচাবোৰ কল্পনা কৰিব পাৰেনে? আপুনি ৰাতিপুৱাৰ চাহ কেনেকৈ ভাল পায়?',
      hi: 'क्या आप चाय बागानों की कल्पना कर सकते हैं? आपको सुबह की चाय कैसी पसंद है?',
      bn: 'আপনি কি সবুজ চা বাগান কল্পনা করতে পারেন? আপনি সকালের চা কেমন পছন্দ করেন?'
    },
    tags: ['nature', 'tea', 'daily life'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  {
    id: 'assam_pitha',
    region: 'Assam',
    contentLocaleSupport: ['en', 'as', 'hi', 'bn'],
    theme: 'Food',
    title: {
      en: 'Pitha and Laru',
      as: 'পিঠা আৰু লাৰু',
      hi: 'पीठा और लारू',
      bn: 'পিঠা এবং লাড়ু'
    },
    description: {
      en: 'Traditional Assamese sweets like Pitha and Laru are made from rice flour, coconut, and jaggery.',
      as: 'পিঠা আৰু লাৰুৰ দৰে পৰম্পৰাগত অসমীয়া মিঠাই চাউলৰ গুড়ি, নাৰিকল আৰু গুড়ৰ পৰা তৈয়াৰ কৰা হয়।',
      hi: 'पीठा और लारू जैसी पारंपरिक असमिया मिठाइयां चावल के आटे, नारियल और गुड़ से बनाई जाती हैं।',
      bn: 'পিঠা এবং লাড়ুর মতো ঐতিহ্যবাহী অসমীয়া মিষ্টি চালের গুঁড়ো, নারকেল এবং গুড় দিয়ে তৈরি করা হয়।'
    },
    prompt: {
      en: 'Do you enjoy the taste of sweet Pitha? Who made the best Pitha in your home?',
      as: 'আপুনি মিঠা পিঠাৰ সোৱাদ ভাল পায়নে? আপোনাৰ ঘৰত আটাইতকৈ ভাল পিঠা কোনে বনাইছিল?',
      hi: 'क्या आपको मीठे पीठा का स्वाद पसंद है? आपके घर में सबसे अच्छा पीठा किसने बनाया?',
      bn: 'আপনি কি মিষ্টি পিঠার স্বাদ উপভোগ করেন? আপনার বাড়িতে সবচেয়ে ভালো পিঠা কে তৈরি করতেন?'
    },
    tags: ['food', 'sweets', 'family'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  // Arunachal Pradesh
  {
    id: 'arunachal_tawang',
    region: 'Arunachal Pradesh',
    contentLocaleSupport: ['en', 'hi'],
    theme: 'Nature',
    title: {
      en: 'Tawang Monastery',
      hi: 'तवांग मठ'
    },
    description: {
      en: 'Tawang Monastery is the largest monastery in India, located in Arunachal Pradesh.',
      hi: 'तवांग मठ भारत का सबसे बड़ा मठ है, जो अरुणाचल प्रदेश में स्थित है।'
    },
    prompt: {
      en: 'The mountains in Tawang are beautiful. Do you remember visiting the hills?',
      hi: 'तवांग के पहाड़ बहुत सुंदर हैं। क्या आपको पहाड़ों की यात्रा याद है?'
    },
    tags: ['monastery', 'mountains', 'peace'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  // Manipur
  {
    id: 'manipur_loktak',
    region: 'Manipur',
    contentLocaleSupport: ['en', 'hi'],
    theme: 'Nature',
    title: {
      en: 'Loktak Lake',
      hi: 'लोकतक झील'
    },
    description: {
      en: 'Loktak is famous for its floating phumdis (islands).',
      hi: 'लोकतक अपने तैरते हुए फुमदी (द्वीपों) के लिए प्रसिद्ध है।'
    },
    prompt: {
      en: 'The floating islands on Loktak Lake are unique. Have you ever seen a large lake?',
      hi: 'लोकतक झील पर तैरते द्वीप अद्वितीय हैं। क्या आपने कभी कोई बड़ी झील देखी है?'
    },
    tags: ['lake', 'nature', 'water'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  // Meghalaya
  {
    id: 'meghalaya_root_bridges',
    region: 'Meghalaya',
    contentLocaleSupport: ['en', 'hi', 'bn'],
    theme: 'Nature',
    title: {
      en: 'Living Root Bridges',
      hi: 'जीवित जड़ पुल',
      bn: 'জীবন্ত শিকড়ের সেতু'
    },
    description: {
      en: 'Meghalaya is known for bridges grown from tree roots.',
      hi: 'मेघालय पेड़ की जड़ों से बने पुलों के लिए जाना जाता है।',
      bn: 'মেঘালয় গাছের শিকড় থেকে গজানো সেতুর জন্য পরিচিত।'
    },
    prompt: {
      en: 'Nature provides amazing structures. Have you walked through dense forests?',
      hi: 'प्रकृति अद्भुत संरचनाएं प्रदान करती है। क्या आप घने जंगलों से गुज़रे हैं?',
      bn: 'প্রকৃতি আশ্চর্যজনক কাঠামো প্রদান করে। আপনি কি ঘন জঙ্গলের মধ্য দিয়ে হেঁটেছেন?'
    },
    tags: ['forest', 'nature', 'bridge'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  // Mizoram
  {
    id: 'mizoram_chapchar',
    region: 'Mizoram',
    contentLocaleSupport: ['en', 'hi'],
    theme: 'Festivals',
    title: {
      en: 'Chapchar Kut',
      hi: 'चापचर कुट'
    },
    description: {
      en: 'Chapchar Kut is the biggest spring festival in Mizoram.',
      hi: 'चापचर कुट मिजोरम में सबसे बड़ा वसंत त्योहार है।'
    },
    prompt: {
      en: 'Spring brings colorful festivals. What is your favorite spring memory?',
      hi: 'वसंत रंगीन त्योहार लाता है। आपकी पसंदीदा वसंत की याद कौन सी है?'
    },
    tags: ['festival', 'spring', 'dance'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  // Nagaland
  {
    id: 'nagaland_hornbill',
    region: 'Nagaland',
    contentLocaleSupport: ['en', 'hi'],
    theme: 'Festivals',
    title: {
      en: 'Hornbill Festival',
      hi: 'हॉर्नबिल महोत्सव'
    },
    description: {
      en: 'The Hornbill Festival showcases the rich culture of Nagaland.',
      hi: 'हॉर्नबिल महोत्सव नागालैंड की समृद्ध संस्कृति को दर्शाता है।'
    },
    prompt: {
      en: 'Music and dance bring people together. Do you enjoy traditional music?',
      hi: 'संगीत और नृत्य लोगों को एक साथ लाते हैं। क्या आपको पारंपरिक संगीत पसंद है?'
    },
    tags: ['festival', 'music', 'culture'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  // Sikkim
  {
    id: 'sikkim_kanchenjunga',
    region: 'Sikkim',
    contentLocaleSupport: ['en', 'hi', 'bn'],
    theme: 'Nature',
    title: {
      en: 'Mount Kanchenjunga',
      hi: 'माउंट कंचनजंघा',
      bn: 'মাউন্ট কাঞ্চনজঙ্ঘা'
    },
    description: {
      en: 'Kanchenjunga is the third highest peak in the world, visible from Sikkim.',
      hi: 'कंचनजंघा दुनिया की तीसरी सबसे ऊंची चोटी है, जो सिक्किम से दिखाई देती है।',
      bn: 'কাঞ্চনজঙ্ঘা বিশ্বের তৃতীয় সর্বোচ্চ শৃঙ্গ, যা সিকিম থেকে দৃশ্যমান।'
    },
    prompt: {
      en: 'The snow-capped mountains are breathtaking. Do you like cold weather?',
      hi: 'बर्फ से ढके पहाड़ लुभावने हैं। क्या आपको ठंडा मौसम पसंद है?',
      bn: 'তুষারাবৃত পাহাড়গুলো শ্বাসরুদ্ধকর। আপনি কি ঠান্ডা আবহাওয়া পছন্দ করেন?'
    },
    tags: ['mountains', 'snow', 'nature'],
    source: 'Curated Cultural Content',
    isDemo: true
  },
  // Tripura
  {
    id: 'tripura_ujjayanta',
    region: 'Tripura',
    contentLocaleSupport: ['en', 'hi', 'bn'],
    theme: 'Places',
    title: {
      en: 'Ujjayanta Palace',
      hi: 'उज्जयंत महल',
      bn: 'উজ্জয়ন্ত প্রাসাদ'
    },
    description: {
      en: 'The Ujjayanta Palace is a stunning royal palace in Agartala.',
      hi: 'उज्जयंत महल अगरतला में एक शानदार शाही महल है।',
      bn: 'উজ্জয়ন্ত প্রাসাদ আগরতলার একটি অত্যাশ্চর্য রাজপ্রাসাদ।'
    },
    prompt: {
      en: 'Palaces hold many old stories. Have you ever visited a historical place?',
      hi: 'महलों में कई पुरानी कहानियाँ होती हैं। क्या आपने कभी किसी ऐतिहासिक जगह की यात्रा की है?',
      bn: 'প্রাসাদগুলো অনেক পুরনো গল্প ধারণ করে। আপনি কি কখনো কোনো ঐতিহাসিক স্থানে গেছেন?'
    },
    tags: ['palace', 'history', 'places'],
    source: 'Curated Cultural Content',
    isDemo: true
  }
];

export const ALL_CULTURAL_CONTENT = [...CULTURAL_PACK_NER];
