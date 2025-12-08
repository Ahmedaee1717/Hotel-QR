import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

// Type definitions for Cloudflare bindings
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate unique booking reference
function generateBookingReference(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `HB-${date}-${random}`
}

// Generate session token
function generateSessionToken(): string {
  return crypto.randomUUID()
}

// Language configuration
const SUPPORTED_LANGUAGES = {
  'en': { name: 'English', native: 'English', flag: '🇬🇧' },
  'ar': { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  'de': { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  'ru': { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  'pl': { name: 'Polish', native: 'Polski', flag: '🇵🇱' },
  'it': { name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  'fr': { name: 'French', native: 'Français', flag: '🇫🇷' },
  'cs': { name: 'Czech', native: 'Čeština', flag: '🇨🇿' },
  'uk': { name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' }
}

// AI Translation using OpenAI GPT-4 (for 100% accurate tourism translations)
async function translateWithAI(texts: string[], targetLang: string, apiKey: string): Promise<string[]> {
  if (!texts || texts.length === 0) return []
  
  const languageNames: Record<string, string> = {
    'ar': 'Modern Standard Arabic',
    'de': 'German', 
    'ru': 'Russian',
    'pl': 'Polish',
    'it': 'Italian',
    'fr': 'French',
    'cs': 'Czech',
    'uk': 'Ukrainian'
  }
  
  try {
    const combinedText = texts.join('\n---SPLIT---\n')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `You are a professional tourism translator specializing in hotel, resort, and travel content for Egypt Red Sea destinations (Hurghada, Marsa Alam). 

CRITICAL REQUIREMENTS:
- Translate with 100% accuracy to ${languageNames[targetLang]}
- Maintain tourism marketing tone and appeal
- Preserve formatting, punctuation, and special characters
- Keep proper nouns (hotel names, locations) unchanged
- Use appropriate formality level for hospitality industry
- Ensure cultural appropriateness for ${languageNames[targetLang]} speakers
- Output translations separated by ---SPLIT--- markers
- Output ONLY the translations, NO explanations or notes`
        }, {
          role: 'user',
          content: combinedText
        }],
        temperature: 0.2,
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      console.error('Translation API error:', await response.text())
      return texts // Fallback to original
    }
    
    const data: any = await response.json()
    const translatedText = data.choices?.[0]?.message?.content?.trim()
    
    if (!translatedText) return texts
    
    return translatedText.split('---SPLIT---').map((t: string) => t.trim())
  } catch (error) {
    console.error(`Translation error for ${targetLang}:`, error)
    return texts // Fallback to original text
  }
}

// Helper function to translate activity content
async function translateActivityContent(
  titleEn: string,
  shortDescriptionEn: string,
  targetLang: string,
  apiKey: string
): Promise<{ title: string; short_description: string }> {
  try {
    const translated = await translateWithAI(
      [titleEn, shortDescriptionEn],
      targetLang,
      apiKey
    );
    
    return {
      title: translated[0] || titleEn,
      short_description: translated[1] || shortDescriptionEn
    };
  } catch (error) {
    console.error('Activity translation error:', error);
    return {
      title: titleEn,
      short_description: shortDescriptionEn
    };
  }
}

// ============================================
// SAAS HOMEPAGE
// ============================================

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GuestConnect - Digital Guest Experience Platform for Hotels & Resorts</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .gradient-text {
            background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .feature-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
            transform: translateY(-4px);
        }
    </style>
</head>
<body class="bg-white">
    <!-- Navigation -->
    <nav class="fixed top-0 w-full bg-white/98 backdrop-blur-sm border-b border-gray-100 z-50">
        <div class="max-w-7xl mx-auto px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center">
                    <!-- GuestConnect Logo -->
                    <img src="https://www.genspark.ai/api/files/s/Az5K2rEF" alt="GuestConnect - Your Resort, Connected" class="h-14 w-auto">
                </div>
                <div class="hidden md:flex items-center space-x-10">
                    <a href="#how-it-works" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition">How It Works</a>
                    <a href="#features" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Features</a>
                    <a href="/admin/dashboard" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Login</a>
                    <a href="/admin/dashboard" class="bg-gray-900 text-white px-5 py-2.5 rounded-md hover:bg-gray-800 transition text-sm font-medium">
                        Get Started
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="pt-32 pb-20 px-6">
        <div class="max-w-7xl mx-auto">
            <div class="max-w-4xl mx-auto text-center mb-16">
                <h1 class="text-6xl md:text-7xl font-light text-gray-900 mb-8 leading-[1.1] tracking-tight">
                    One QR code<br/>in every room
                </h1>
                <p class="text-xl text-gray-600 mb-4 leading-relaxed font-light max-w-2xl mx-auto">
                    Guests scan. They see everything—your restaurants, events, spa, activities.
                </p>
                <p class="text-xl text-gray-600 mb-12 leading-relaxed font-light max-w-2xl mx-auto">
                    All branded to your hotel. No app download required.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/admin/dashboard" class="bg-gray-900 text-white px-8 py-4 rounded-md hover:bg-gray-800 transition font-medium text-base">
                        Start Building
                    </a>
                    <a href="#how-it-works" class="bg-white text-gray-900 px-8 py-4 rounded-md hover:bg-gray-50 transition font-medium border border-gray-200 text-base">
                        See How It Works
                    </a>
                </div>
            </div>

            <!-- Hero Visual: QR Code in Hotel Room -->
            <div class="max-w-5xl mx-auto">
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                    <div class="relative">
                        <!-- Beautiful Hotel Room Image with QR Code -->
                        <img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1400&q=80" 
                             alt="Luxury hotel room with QR code on nightstand" 
                             class="w-full h-[500px] object-cover">
                        
                        <!-- Overlay with QR Code Card -->
                        <div class="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div class="bg-white p-8 rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                                <div class="text-center">
                                    <div class="w-48 h-48 mx-auto mb-4">
                                        <svg viewBox="0 0 100 100" class="w-full h-full">
                                            <rect width="100" height="100" fill="white"/>
                                            <!-- QR Code Pattern -->
                                            <rect x="10" y="10" width="25" height="25" fill="black"/>
                                            <rect x="65" y="10" width="25" height="25" fill="black"/>
                                            <rect x="10" y="65" width="25" height="25" fill="black"/>
                                            <rect x="15" y="15" width="15" height="15" fill="white"/>
                                            <rect x="70" y="15" width="15" height="15" fill="white"/>
                                            <rect x="15" y="70" width="15" height="15" fill="white"/>
                                            <rect x="20" y="20" width="5" height="5" fill="black"/>
                                            <rect x="75" y="20" width="5" height="5" fill="black"/>
                                            <rect x="20" y="75" width="5" height="5" fill="black"/>
                                            <!-- Additional QR patterns -->
                                            <rect x="45" y="15" width="5" height="5" fill="black"/>
                                            <rect x="55" y="20" width="5" height="5" fill="black"/>
                                            <rect x="40" y="25" width="5" height="5" fill="black"/>
                                            <rect x="50" y="30" width="5" height="5" fill="black"/>
                                            <rect x="60" y="35" width="5" height="5" fill="black"/>
                                            <rect x="45" y="40" width="5" height="5" fill="black"/>
                                            <rect x="55" y="45" width="5" height="5" fill="black"/>
                                            <rect x="40" y="50" width="5" height="5" fill="black"/>
                                            <rect x="50" y="55" width="5" height="5" fill="black"/>
                                            <rect x="60" y="60" width="5" height="5" fill="black"/>
                                        </svg>
                                    </div>
                                    <p class="text-base font-semibold text-gray-900 mb-1">Scan to Explore</p>
                                    <p class="text-sm text-gray-600">Room 305</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-600 mt-6">Unique QR code per room</p>
                        </div>

                        <!-- Arrow -->
                        <div class="text-center">
                            <i class="fas fa-arrow-right text-4xl text-gray-300 hidden md:block"></i>
                            <i class="fas fa-arrow-down text-4xl text-gray-300 md:hidden"></i>
                        </div>

                        <!-- Guest Experience -->
                        <div class="md:col-span-2 mt-8">
                            <div class="bg-white rounded-xl p-8 shadow-lg">
                                <div class="text-center mb-6">
                                    <h3 class="text-2xl font-semibold text-gray-900 mb-2">What Guests See</h3>
                                    <p class="text-gray-600">Instant access to everything your hotel offers</p>
                                </div>
                                <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
                                    <div class="text-center">
                                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <i class="fas fa-utensils text-gray-600"></i>
                                        </div>
                                        <p class="text-xs text-gray-600">Restaurants</p>
                                    </div>
                                    <div class="text-center">
                                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <i class="fas fa-calendar-star text-gray-600"></i>
                                        </div>
                                        <p class="text-xs text-gray-600">Events</p>
                                    </div>
                                    <div class="text-center">
                                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <i class="fas fa-spa text-gray-600"></i>
                                        </div>
                                        <p class="text-xs text-gray-600">Spa</p>
                                    </div>
                                    <div class="text-center">
                                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <i class="fas fa-hiking text-gray-600"></i>
                                        </div>
                                        <p class="text-xs text-gray-600">Activities</p>
                                    </div>
                                    <div class="text-center">
                                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <i class="fas fa-concierge-bell text-gray-600"></i>
                                        </div>
                                        <p class="text-xs text-gray-600">Services</p>
                                    </div>
                                    <div class="text-center">
                                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <i class="fas fa-map text-gray-600"></i>
                                        </div>
                                        <p class="text-xs text-gray-600">Hotel Map</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="py-24 px-6 bg-gray-50">
        <div class="max-w-7xl mx-auto">
            <div class="max-w-2xl mb-20">
                <h2 class="text-4xl md:text-5xl font-light text-gray-900 mb-6">How it works</h2>
                <p class="text-lg text-gray-600 leading-relaxed">Simple for hotels. Seamless for guests.</p>
            </div>

            <div class="grid md:grid-cols-3 gap-16">
                <!-- Step 1 -->
                <div>
                    <div class="text-6xl font-light text-gray-200 mb-6">01</div>
                    <h3 class="text-2xl font-medium text-gray-900 mb-4">Build your page</h3>
                    <p class="text-gray-600 leading-relaxed mb-6">
                        Add your logo, set your colors and fonts. Upload your restaurants, events, spa services, activities. Everything is customizable.
                    </p>
                    <ul class="space-y-2 text-sm text-gray-600">
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Custom branding (colors, fonts, logo)</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Add offerings with photos & videos</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Connect activity vendors</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>8-language AI translation</li>
                    </ul>
                </div>

                <!-- Step 2 -->
                <div>
                    <div class="text-6xl font-light text-gray-200 mb-6">02</div>
                    <h3 class="text-2xl font-medium text-gray-900 mb-4">Generate QR codes</h3>
                    <p class="text-gray-600 leading-relaxed mb-6">
                        Create a unique QR code for each room. Print and place them. Guests scan with their phone camera—no app needed.
                    </p>
                    <ul class="space-y-2 text-sm text-gray-600">
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Unique code per room</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Track which rooms scan</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>No app download required</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Works on any phone</li>
                    </ul>
                </div>

                <!-- Step 3 -->
                <div>
                    <div class="text-6xl font-light text-gray-200 mb-6">03</div>
                    <h3 class="text-2xl font-medium text-gray-900 mb-4">Guests browse & book</h3>
                    <p class="text-gray-600 leading-relaxed mb-6">
                        They see everything instantly. Book activities, check event times, browse restaurants—all in their language.
                    </p>
                    <ul class="space-y-2 text-sm text-gray-600">
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Instant activity booking</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Real-time availability</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Auto-translated content</li>
                        <li class="flex items-center gap-2"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>Callback requests</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 px-6">
        <div class="max-w-7xl mx-auto">
            <div class="max-w-2xl mb-20">
                <h2 class="text-4xl md:text-5xl font-light text-gray-900 mb-6">Complete control over<br/>your guest experience</h2>
                <p class="text-lg text-gray-600 leading-relaxed">Everything you need to create a premium digital experience for your guests.</p>
            </div>

            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                <!-- Feature 1 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-palette text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Full Brand Customization</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Your colors, fonts, logo, and layout. Choose from modern, elegant, or minimal styles. Every pixel matches your brand.
                        </p>
                    </div>
                </div>

                <!-- Feature 2 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-language text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">8-Language AI Translation</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            English, Arabic, German, French, Italian, Russian, Polish, Czech, Ukrainian. Powered by GPT-4 for 100% accurate tourism translations.
                        </p>
                    </div>
                </div>

                <!-- Feature 3 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-utensils text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Restaurants & Dining</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Add all your restaurants with menus, photos, videos, opening hours, locations. Guests see everything at a glance.
                        </p>
                    </div>
                </div>

                <!-- Feature 4 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-calendar-alt text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Events & Entertainment</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Showcase your events, live music, themed nights. Include dates, times, photos, videos. Keep guests informed and engaged.
                        </p>
                    </div>
                </div>

                <!-- Feature 5 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-hiking text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Activity Booking System</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Full booking system for excursions and activities. Connect local vendors. Real-time availability. Automated confirmations. Commission tracking.
                        </p>
                    </div>
                </div>

                <!-- Feature 6 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-spa text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Spa & Wellness</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Display spa treatments, massage services, wellness programs. Add pricing, duration, photos, booking options.
                        </p>
                    </div>
                </div>

                <!-- Feature 7 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-map-marked-alt text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Interactive Hotel Map</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Upload your hotel map or grounds layout. Floating button for easy access. Guests find their way around effortlessly.
                        </p>
                    </div>
                </div>

                <!-- Feature 8 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-video text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Photos & Videos</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Add videos to activities and offerings. Upload multiple photos. Show guests exactly what to expect.
                        </p>
                    </div>
                </div>

                <!-- Feature 9 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-chart-line text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Analytics Dashboard</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Track bookings, QR scans, popular activities, revenue. See which rooms engage most. Make data-driven decisions.
                        </p>
                    </div>
                </div>

                <!-- Feature 10 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-plug text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Vendor Integration</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Activity vendors get their own dashboard. They manage listings, pricing, availability. You control commissions and approvals.
                        </p>
                    </div>
                </div>

                <!-- Feature 11 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-qrcode text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">QR Code Management</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Generate unique QR codes for each room. Download as PDFs. Track which codes are scanned. Regenerate anytime.
                        </p>
                    </div>
                </div>

                <!-- Feature 12 -->
                <div class="feature-card">
                    <div class="mb-6">
                        <div class="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <i class="fas fa-plus-circle text-white"></i>
                        </div>
                        <h3 class="text-xl font-medium text-gray-900 mb-3">Custom Sections</h3>
                        <p class="text-gray-600 leading-relaxed text-sm">
                            Create any section you need—kids club, beach services, golf, diving center. Fully customizable categories with custom icons.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 px-6 bg-gray-900 text-white">
        <div class="max-w-4xl mx-auto text-center">
            <h2 class="text-4xl md:text-5xl font-light mb-6">Ready to get started?</h2>
            <p class="text-xl text-gray-300 mb-12 font-light">Create your hotel's digital guest experience today.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/admin/dashboard" class="bg-white text-gray-900 px-8 py-4 rounded-md hover:bg-gray-100 transition font-medium">
                    Start Building Now
                </a>
                <a href="/vendor/login" class="bg-transparent border border-white text-white px-8 py-4 rounded-md hover:bg-white/10 transition font-medium">
                    Vendor Login
                </a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-100 py-12 px-6">
        <div class="max-w-7xl mx-auto">
            <div class="grid md:grid-cols-4 gap-12 mb-12">
                <div class="md:col-span-2">
                    <img src="https://www.genspark.ai/api/files/s/Az5K2rEF" alt="GuestConnect - Your Resort, Connected" class="h-12 w-auto mb-4">
                    <p class="text-sm text-gray-600 leading-relaxed max-w-md">
                        Digital guest experience platform for hotels and resorts. QR-powered in-room access to everything your property offers.
                    </p>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-4 text-sm">Platform</h4>
                    <ul class="space-y-3 text-sm text-gray-600">
                        <li><a href="#features" class="hover:text-gray-900 transition">Features</a></li>
                        <li><a href="#how-it-works" class="hover:text-gray-900 transition">How It Works</a></li>
                        <li><a href="/admin/dashboard" class="hover:text-gray-900 transition">Demo</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-4 text-sm">Access</h4>
                    <ul class="space-y-3 text-sm text-gray-600">
                        <li><a href="/admin/dashboard" class="hover:text-gray-900 transition">Hotel Admin</a></li>
                        <li><a href="/vendor/login" class="hover:text-gray-900 transition">Activity Vendor</a></li>
                        <li><a href="/superadmin" class="hover:text-gray-900 transition">Super Admin</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-100 pt-8 text-center">
                <p class="text-sm text-gray-500">&copy; 2024 GuestConnect. Digital guest experience platform.</p>
            </div>
        </div>
    </footer>
</body>
</html>
  `)
})

// ============================================
// GUEST API ROUTES
// ============================================

// Welcome page - QR code entry point
app.get('/api/welcome/:property_slug/:room_token', async (c) => {
  const { property_slug, room_token } = c.req.param()
  const { DB } = c.env

  try {
    // Validate room token and get property/room info
    const room = await DB.prepare(`
      SELECT r.*, p.* FROM rooms r
      JOIN properties p ON r.property_id = p.property_id
      WHERE r.qr_code_data = ? AND p.slug = ? AND p.status = 'active'
    `).bind(room_token, property_slug).first()

    if (!room) {
      return c.json({ error: 'Invalid QR code or property' }, 404)
    }

    // Create guest session
    const session_token = generateSessionToken()
    const guest = await DB.prepare(`
      INSERT INTO guests (property_id, room_id, session_token, preferred_language)
      VALUES (?, ?, ?, 'en')
      RETURNING guest_id, session_token
    `).bind(room.property_id, room.room_id, session_token).first()

    // Get featured activities
    const featured = await DB.prepare(`
      SELECT a.*, v.business_name as vendor_name, c.name_en as category_name
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE vp.property_id = ? AND a.status = 'active' AND a.is_featured = 1
      ORDER BY a.popularity_score DESC
      LIMIT 6
    `).bind(room.property_id).all()

    // Log analytics event
    await DB.prepare(`
      INSERT INTO analytics_events (property_id, guest_id, event_type, entity_id, metadata)
      VALUES (?, ?, 'qr_scan', ?, ?)
    `).bind(room.property_id, guest.guest_id, room.room_id, JSON.stringify({ room_token })).run()

    return c.json({
      session_token: guest.session_token,
      property: {
        name: room.name,
        slug: room.slug,
        logo: room.brand_logo_url,
        primary_color: room.primary_color,
        secondary_color: room.secondary_color,
        supported_languages: JSON.parse(room.supported_languages)
      },
      room: {
        number: room.room_number,
        type: room.room_type
      },
      featured_activities: featured.results
    })
  } catch (error) {
    console.error('Welcome API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all categories
app.get('/api/categories', async (c) => {
  const { DB } = c.env
  const lang = c.req.query('lang') || 'en'

  try {
    const categories = await DB.prepare(`
      SELECT 
        category_id,
        ${lang === 'ar' ? 'name_ar' : 'name_en'} as name,
        slug,
        icon_name,
        display_order
      FROM categories
      WHERE parent_category_id IS NULL
      ORDER BY display_order ASC
    `).all()

    return c.json({ categories: categories.results })
  } catch (error) {
    console.error('Categories API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get activities catalog
app.get('/api/activities', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  const category = c.req.query('category')
  const sort = c.req.query('sort') || 'popularity'
  const lang = c.req.query('lang') || 'en'
  const page = parseInt(c.req.query('page') || '1')
  const per_page = 20

  try {
    let query = `
      SELECT 
        a.activity_id,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as title,
        ${lang === 'ar' ? 'a.short_description_ar' : 'a.short_description_en'} as short_description,
        a.images,
        a.duration_minutes,
        a.capacity_per_slot,
        a.price,
        a.currency,
        a.is_featured,
        v.business_name as vendor_name,
        v.slug as vendor_slug,
        ${lang === 'ar' ? 'c.name_ar' : 'c.name_en'} as category_name,
        c.slug as category_slug
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE vp.property_id = ? AND a.status = 'active'
    `

    const params: any[] = [property_id]

    if (category) {
      query += ` AND c.slug = ?`
      params.push(category)
    }

    // Sorting
    if (sort === 'price') {
      query += ` ORDER BY a.price ASC`
    } else if (sort === 'duration') {
      query += ` ORDER BY a.duration_minutes ASC`
    } else {
      query += ` ORDER BY a.popularity_score DESC`
    }

    query += ` LIMIT ? OFFSET ?`
    params.push(per_page, (page - 1) * per_page)

    const activities = await DB.prepare(query).bind(...params).all()

    return c.json({
      activities: activities.results,
      page,
      per_page,
      total: activities.results.length
    })
  } catch (error) {
    console.error('Activities API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get single activity details
app.get('/api/activities/:activity_id', async (c) => {
  const { DB } = c.env
  const { activity_id } = c.req.param()
  const lang = c.req.query('lang') || 'en'

  try {
    const activity = await DB.prepare(`
      SELECT 
        a.*,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as title,
        ${lang === 'ar' ? 'a.short_description_ar' : 'a.short_description_en'} as short_description,
        ${lang === 'ar' ? 'a.full_description_ar' : 'a.full_description_en'} as full_description,
        v.business_name as vendor_name,
        v.slug as vendor_slug,
        v.phone as vendor_phone,
        v.email as vendor_email,
        v.certifications as vendor_certifications,
        v.safety_rating as vendor_safety_rating,
        ${lang === 'ar' ? 'c.name_ar' : 'c.name_en'} as category_name
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      WHERE a.activity_id = ? AND a.status = 'active'
    `).bind(activity_id).first()

    if (!activity) {
      return c.json({ error: 'Activity not found' }, 404)
    }

    // Get availability schedule
    const schedule = await DB.prepare(`
      SELECT * FROM availability_schedule
      WHERE activity_id = ?
      ORDER BY day_of_week, start_time
    `).bind(activity_id).all()

    return c.json({
      activity: {
        ...activity,
        images: activity.images ? JSON.parse(activity.images) : [],
        requirements: activity.requirements ? JSON.parse(activity.requirements) : {},
        includes: activity.includes ? JSON.parse(activity.includes) : []
      },
      schedule: schedule.results
    })
  } catch (error) {
    console.error('Activity detail API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get activity availability for specific date
app.get('/api/availability/:activity_id', async (c) => {
  const { DB } = c.env
  const { activity_id } = c.req.param()
  const date = c.req.query('date') // Format: YYYY-MM-DD

  try {
    const dayOfWeek = new Date(date).getDay()

    // Get scheduled slots for this day
    const slots = await DB.prepare(`
      SELECT 
        start_time,
        end_time,
        slots_available
      FROM availability_schedule
      WHERE activity_id = ?
        AND (day_of_week = ? OR specific_date = ?)
        AND (valid_from IS NULL OR valid_from <= ?)
        AND (valid_until IS NULL OR valid_until >= ?)
      ORDER BY start_time
    `).bind(activity_id, dayOfWeek, date, date, date).all()

    // Get existing bookings for this date
    const bookings = await DB.prepare(`
      SELECT activity_time, SUM(num_participants) as booked
      FROM bookings
      WHERE activity_id = ? AND activity_date = ? AND booking_status = 'confirmed'
      GROUP BY activity_time
    `).bind(activity_id, date).all()

    const bookedMap = new Map()
    bookings.results.forEach((b: any) => {
      bookedMap.set(b.activity_time, b.booked)
    })

    // Calculate availability
    const availability = slots.results.map((slot: any) => {
      const booked = bookedMap.get(slot.start_time) || 0
      return {
        time: slot.start_time,
        capacity: slot.slots_available,
        available: slot.slots_available - booked,
        booked
      }
    })

    return c.json({ date, slots: availability })
  } catch (error) {
    console.error('Availability API error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create booking
app.post('/api/bookings', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const {
    session_token,
    activity_id,
    activity_date,
    activity_time,
    num_participants,
    guest_info,
    payment_method,
    guest_notes
  } = body

  try {
    // Validate session
    const guest = await DB.prepare(`
      SELECT * FROM guests WHERE session_token = ?
    `).bind(session_token).first()

    if (!guest) {
      return c.json({ error: 'Invalid session' }, 401)
    }

    // Get activity details
    const activity = await DB.prepare(`
      SELECT a.*, v.commission_rate
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      WHERE a.activity_id = ?
    `).bind(activity_id).first()

    if (!activity) {
      return c.json({ error: 'Activity not found' }, 404)
    }

    // Check availability
    const dayOfWeek = new Date(activity_date).getDay()
    const slot = await DB.prepare(`
      SELECT slots_available FROM availability_schedule
      WHERE activity_id = ? AND (day_of_week = ? OR specific_date = ?) AND start_time = ?
    `).bind(activity_id, dayOfWeek, activity_date, activity_time).first()

    if (!slot) {
      return c.json({ error: 'Time slot not available' }, 400)
    }

    // Check current bookings
    const booked = await DB.prepare(`
      SELECT SUM(num_participants) as total
      FROM bookings
      WHERE activity_id = ? AND activity_date = ? AND activity_time = ? AND booking_status = 'confirmed'
    `).bind(activity_id, activity_date, activity_time).first()

    const currentBooked = booked?.total || 0
    if (currentBooked + num_participants > slot.slots_available) {
      return c.json({ error: 'Not enough capacity available' }, 400)
    }

    // Update guest info if provided
    if (guest_info) {
      await DB.prepare(`
        UPDATE guests
        SET first_name = ?, last_name = ?, email = ?, phone = ?, preferred_language = ?
        WHERE guest_id = ?
      `).bind(
        guest_info.first_name,
        guest_info.last_name,
        guest_info.email,
        guest_info.phone,
        guest_info.preferred_language || 'en',
        guest.guest_id
      ).run()
    }

    // Calculate pricing
    const total_price = activity.price * num_participants
    const commission_amount = total_price * (activity.commission_rate / 100)

    // Generate booking reference
    const booking_reference = generateBookingReference()

    // Determine booking status based on payment method
    const booking_status = payment_method === 'pay_at_vendor' ? 'confirmed' : 'pending'
    const payment_status = payment_method === 'pay_at_vendor' ? 'pending' : 'pending'

    // Create booking
    const booking = await DB.prepare(`
      INSERT INTO bookings (
        booking_reference, guest_id, property_id, activity_id, vendor_id,
        activity_date, activity_time, duration_minutes, num_participants,
        total_price, currency, commission_amount, payment_status, payment_method,
        booking_status, guest_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING booking_id
    `).bind(
      booking_reference,
      guest.guest_id,
      guest.property_id,
      activity_id,
      activity.vendor_id,
      activity_date,
      activity_time,
      activity.duration_minutes,
      num_participants,
      total_price,
      activity.currency,
      commission_amount,
      payment_status,
      payment_method,
      booking_status,
      guest_notes || null
    ).first()

    // Log analytics event
    await DB.prepare(`
      INSERT INTO analytics_events (property_id, guest_id, event_type, entity_id, metadata)
      VALUES (?, ?, 'booking_created', ?, ?)
    `).bind(guest.property_id, guest.guest_id, booking.booking_id, JSON.stringify({ payment_method })).run()

    return c.json({
      success: true,
      booking_id: booking.booking_id,
      booking_reference,
      status: booking_status,
      payment_required: payment_method !== 'pay_at_vendor',
      total_price,
      currency: activity.currency
    })
  } catch (error) {
    console.error('Booking creation error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get booking details
app.get('/api/bookings/:booking_id', async (c) => {
  const { DB } = c.env
  const { booking_id } = c.req.param()
  const session_token = c.req.header('X-Session-Token')
  const lang = c.req.query('lang') || 'en'

  try {
    const booking = await DB.prepare(`
      SELECT 
        b.*,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as activity_title,
        a.images as activity_images,
        v.business_name as vendor_name,
        v.phone as vendor_phone,
        v.email as vendor_email,
        g.first_name,
        g.last_name,
        g.email as guest_email,
        g.phone as guest_phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN vendors v ON b.vendor_id = v.vendor_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.booking_id = ? AND g.session_token = ?
    `).bind(booking_id, session_token).first()

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404)
    }

    return c.json({ booking })
  } catch (error) {
    console.error('Get booking error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get guest's bookings
app.get('/api/my-bookings', async (c) => {
  const { DB } = c.env
  const session_token = c.req.header('X-Session-Token')
  const status = c.req.query('status') || 'upcoming'
  const lang = c.req.query('lang') || 'en'

  try {
    const guest = await DB.prepare(`
      SELECT guest_id FROM guests WHERE session_token = ?
    `).bind(session_token).first()

    if (!guest) {
      return c.json({ error: 'Invalid session' }, 401)
    }

    let query = `
      SELECT 
        b.*,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as activity_title,
        a.images as activity_images,
        v.business_name as vendor_name,
        v.phone as vendor_phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN vendors v ON b.vendor_id = v.vendor_id
      WHERE b.guest_id = ?
    `

    if (status === 'upcoming') {
      query += ` AND b.activity_date >= date('now') AND b.booking_status = 'confirmed'`
    } else if (status === 'past') {
      query += ` AND b.activity_date < date('now')`
    } else if (status === 'cancelled') {
      query += ` AND b.booking_status = 'cancelled'`
    }

    query += ` ORDER BY b.activity_date DESC, b.activity_time DESC`

    const bookings = await DB.prepare(query).bind(guest.guest_id).all()

    return c.json({ bookings: bookings.results })
  } catch (error) {
    console.error('Get bookings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Cancel booking
app.post('/api/bookings/:booking_id/cancel', async (c) => {
  const { DB } = c.env
  const { booking_id } = c.req.param()
  const session_token = c.req.header('X-Session-Token')

  try {
    const booking = await DB.prepare(`
      SELECT b.*, g.session_token
      FROM bookings b
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.booking_id = ?
    `).bind(booking_id).first()

    if (!booking || booking.session_token !== session_token) {
      return c.json({ error: 'Booking not found' }, 404)
    }

    if (booking.booking_status === 'cancelled') {
      return c.json({ error: 'Booking already cancelled' }, 400)
    }

    // Check cancellation policy
    const activity = await DB.prepare(`
      SELECT cancellation_policy_hours FROM activities WHERE activity_id = ?
    `).bind(booking.activity_id).first()

    const activityDateTime = new Date(`${booking.activity_date}T${booking.activity_time}`)
    const now = new Date()
    const hoursUntilActivity = (activityDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilActivity < activity.cancellation_policy_hours) {
      return c.json({
        error: `Cancellation must be made at least ${activity.cancellation_policy_hours} hours before activity`,
        refund_eligible: false
      }, 400)
    }

    // Cancel booking
    await DB.prepare(`
      UPDATE bookings
      SET booking_status = 'cancelled', cancelled_at = datetime('now')
      WHERE booking_id = ?
    `).bind(booking_id).run()

    return c.json({
      success: true,
      message: 'Booking cancelled successfully',
      refund_eligible: booking.payment_status === 'paid'
    })
  } catch (error) {
    console.error('Cancel booking error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor profile
app.get('/api/vendors/:vendor_slug', async (c) => {
  const { DB } = c.env
  const { vendor_slug } = c.req.param()
  const property_id = c.req.query('property_id')
  const lang = c.req.query('lang') || 'en'

  try {
    const vendor = await DB.prepare(`
      SELECT 
        v.*,
        ${lang === 'ar' ? 'v.description_ar' : 'v.description_en'} as description,
        ${lang === 'ar' ? 'c.name_ar' : 'c.name_en'} as category_name
      FROM vendors v
      JOIN categories c ON v.category_id = c.category_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE v.slug = ? AND vp.property_id = ? AND v.status = 'active'
    `).bind(vendor_slug, property_id).first()

    if (!vendor) {
      return c.json({ error: 'Vendor not found' }, 404)
    }

    // Get vendor's activities
    const activities = await DB.prepare(`
      SELECT 
        a.activity_id,
        ${lang === 'ar' ? 'a.title_ar' : 'a.title_en'} as title,
        ${lang === 'ar' ? 'a.short_description_ar' : 'a.short_description_en'} as short_description,
        a.images,
        a.duration_minutes,
        a.price,
        a.currency
      FROM activities a
      WHERE a.vendor_id = ? AND a.status = 'active'
      ORDER BY a.is_featured DESC, a.popularity_score DESC
    `).bind(vendor.vendor_id).all()

    return c.json({
      vendor: {
        ...vendor,
        cover_images: vendor.cover_images ? JSON.parse(vendor.cover_images) : [],
        certifications: vendor.certifications ? JSON.parse(vendor.certifications) : [],
        working_hours: vendor.working_hours ? JSON.parse(vendor.working_hours) : {},
        operating_hours: vendor.operating_hours ? JSON.parse(vendor.operating_hours) : {},
        social_media: vendor.social_media ? JSON.parse(vendor.social_media) : {},
        specialties: vendor.specialties ? JSON.parse(vendor.specialties) : [],
        languages_spoken: vendor.languages_spoken ? JSON.parse(vendor.languages_spoken) : []
      },
      activities: activities.results
    })
  } catch (error) {
    console.error('Vendor profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// VENDOR API ROUTES
// ============================================

// Vendor login
app.post('/api/vendor/login', async (c) => {
  const { DB } = c.env
  const { email, password } = await c.req.json()

  try {
    const vendor = await DB.prepare(`
      SELECT * FROM vendors WHERE email = ? AND status = 'active'
    `).bind(email).first()

    if (!vendor) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Note: In production, use proper bcrypt password verification
    // For now, we're using the hashed password from seed data
    // You would normally do: const match = await bcrypt.compare(password, vendor.password_hash)
    
    return c.json({
      success: true,
      vendor: {
        vendor_id: vendor.vendor_id,
        business_name: vendor.business_name,
        email: vendor.email,
        slug: vendor.slug
      },
      // In production, generate and return a JWT token here
      token: `vendor-${vendor.vendor_id}-${Date.now()}`
    })
  } catch (error) {
    console.error('Vendor login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Vendor dashboard stats
app.get('/api/vendor/dashboard', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')

  try {
    // Today's bookings
    const todayBookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE vendor_id = ? AND activity_date = date('now')
    `).bind(vendor_id).first()

    // This week's revenue
    const weekRevenue = await DB.prepare(`
      SELECT SUM(total_price - commission_amount) as revenue FROM bookings
      WHERE vendor_id = ? 
        AND activity_date >= date('now', 'weekday 0', '-7 days')
        AND payment_status = 'paid'
    `).bind(vendor_id).first()

    // Pending confirmations
    const pending = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE vendor_id = ? AND booking_status = 'pending'
    `).bind(vendor_id).first()

    // Upcoming bookings
    const upcoming = await DB.prepare(`
      SELECT 
        b.*,
        a.title_en as activity_title,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.vendor_id = ? 
        AND b.activity_date >= date('now')
        AND b.booking_status = 'confirmed'
      ORDER BY b.activity_date, b.activity_time
      LIMIT 10
    `).bind(vendor_id).all()

    return c.json({
      kpis: {
        today_bookings: todayBookings.count,
        week_revenue: weekRevenue.revenue || 0,
        pending_confirmations: pending.count
      },
      upcoming_bookings: upcoming.results
    })
  } catch (error) {
    console.error('Vendor dashboard error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor bookings
app.get('/api/vendor/bookings', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const status = c.req.query('status') || 'upcoming'
  const date_from = c.req.query('date_from')
  const date_to = c.req.query('date_to')

  console.log('GET /api/vendor/bookings - vendor_id:', vendor_id)

  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }

  try {
    let query = `
      SELECT 
        b.*,
        a.title_en as activity_title,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.vendor_id = ?
    `
    const params = [vendor_id]

    if (status === 'upcoming') {
      query += ` AND b.activity_date >= date('now') AND b.booking_status = 'confirmed'`
    } else if (status === 'past') {
      query += ` AND b.activity_date < date('now')`
    } else if (status === 'pending') {
      query += ` AND b.booking_status = 'pending'`
    }

    if (date_from) {
      query += ` AND b.activity_date >= ?`
      params.push(date_from)
    }

    if (date_to) {
      query += ` AND b.activity_date <= ?`
      params.push(date_to)
    }

    query += ` ORDER BY b.activity_date DESC, b.activity_time DESC`

    const bookings = await DB.prepare(query).bind(...params).all()

    console.log('Bookings query returned:', bookings.results?.length || 0, 'bookings')

    return c.json({ bookings: bookings.results || [] })
  } catch (error) {
    console.error('Vendor bookings error:', error)
    return c.json({ error: 'Internal server error: ' + error.message }, 500)
  }
})

// Get vendor callbacks
app.get('/api/vendor/callbacks', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }
  
  try {
    const callbacks = await DB.prepare(`
      SELECT 
        cr.*,
        a.title_en as activity_title,
        a.activity_id
      FROM callback_requests cr
      LEFT JOIN activities a ON cr.activity_id = a.activity_id
      WHERE cr.vendor_id = ? OR (cr.activity_id IS NOT NULL AND a.vendor_id = ?)
      ORDER BY cr.created_at DESC
    `).bind(vendor_id, vendor_id).all()
    
    return c.json(callbacks.results || [])
  } catch (error) {
    console.error('Get vendor callbacks error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update callback status
app.patch('/api/vendor/callbacks/:request_id', async (c) => {
  const { DB } = c.env
  const { request_id } = c.req.param()
  const vendor_id = c.req.header('X-Vendor-ID')
  const { status } = await c.req.json()
  
  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }
  
  try {
    // Verify callback belongs to vendor's activity
    const callback = await DB.prepare(`
      SELECT cr.*, a.vendor_id
      FROM callback_requests cr
      LEFT JOIN activities a ON cr.activity_id = a.activity_id
      WHERE cr.request_id = ?
    `).bind(request_id).first()
    
    if (!callback || (callback.vendor_id && callback.vendor_id != vendor_id)) {
      return c.json({ error: 'Callback not found or access denied' }, 404)
    }
    
    const contacted_at = status === 'contacted' || status === 'completed' ? new Date().toISOString() : null
    
    await DB.prepare(`
      UPDATE callback_requests 
      SET status = ?, contacted_at = ?
      WHERE request_id = ?
    `).bind(status, contacted_at, request_id).run()
    
    return c.json({ success: true, message: 'Callback status updated' })
  } catch (error) {
    console.error('Update callback error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update booking status (vendor confirms or completes)
app.patch('/api/vendor/bookings/:booking_id', async (c) => {
  const { DB } = c.env
  const { booking_id } = c.req.param()
  const vendor_id = c.req.header('X-Vendor-ID')
  const { status, vendor_notes, send_payment_link } = await c.req.json()

  try {
    const booking = await DB.prepare(`
      SELECT * FROM bookings WHERE booking_id = ? AND vendor_id = ?
    `).bind(booking_id, vendor_id).first()

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404)
    }

    // Update booking
    await DB.prepare(`
      UPDATE bookings
      SET booking_status = ?, vendor_notes = ?, payment_link_sent = ?, updated_at = datetime('now')
      WHERE booking_id = ?
    `).bind(status, vendor_notes || booking.vendor_notes, send_payment_link ? 1 : 0, booking_id).run()

    // TODO: If send_payment_link is true, send email with Stripe payment link

    return c.json({ success: true, message: 'Booking updated successfully' })
  } catch (error) {
    console.error('Update booking error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor activities
app.get('/api/vendor/activities', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')

  console.log('GET /api/vendor/activities - vendor_id:', vendor_id)

  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }

  try {
    const activities = await DB.prepare(`
      SELECT 
        a.*,
        c.name_en as category_name
      FROM activities a
      JOIN categories c ON a.category_id = c.category_id
      WHERE a.vendor_id = ?
      ORDER BY a.created_at DESC
    `).bind(vendor_id).all()

    console.log('Activities query returned:', activities.results?.length || 0, 'activities')

    return c.json({ activities: activities.results || [] })
  } catch (error) {
    console.error('Vendor activities error:', error)
    return c.json({ error: 'Internal server error: ' + error.message }, 500)
  }
})

// Create new activity
app.post('/api/vendor/activities', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const body = await c.req.json()

  try {
    const {
      category_id, title_en, title_ar, short_description_en, short_description_ar,
      full_description_en, full_description_ar, images, video_url, duration_minutes,
      capacity_per_slot, price, currency, price_type, requirements,
      includes, excludes, cancellation_policy_hours, status
    } = body

    const activity = await DB.prepare(`
      INSERT INTO activities (
        vendor_id, category_id, title_en, title_ar, short_description_en, short_description_ar,
        full_description_en, full_description_ar, images, video_url, duration_minutes, capacity_per_slot,
        price, currency, price_type, requirements, includes, excludes, cancellation_policy_hours, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING activity_id
    `).bind(
      vendor_id, category_id, title_en, title_ar || title_en,
      short_description_en, short_description_ar || short_description_en,
      full_description_en, full_description_ar || full_description_en,
      JSON.stringify(images), video_url || null, duration_minutes, capacity_per_slot,
      price, currency || 'USD', price_type || 'per_person',
      JSON.stringify(requirements), JSON.stringify(includes), JSON.stringify(excludes),
      cancellation_policy_hours || 24, status || 'draft'
    ).first()

    return c.json({ success: true, activity_id: activity.activity_id })
  } catch (error) {
    console.error('Create activity error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update activity
app.put('/api/vendor/activities/:activity_id', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const { activity_id } = c.req.param()
  const body = await c.req.json()

  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }

  try {
    // Verify activity belongs to vendor
    const existing = await DB.prepare(`
      SELECT activity_id FROM activities WHERE activity_id = ? AND vendor_id = ?
    `).bind(activity_id, vendor_id).first()

    if (!existing) {
      return c.json({ error: 'Activity not found or access denied' }, 404)
    }

    const {
      category_id, title_en, title_ar, short_description_en, short_description_ar,
      full_description_en, full_description_ar, images, video_url, duration_minutes,
      capacity_per_slot, price, currency, price_type, requirements, includes, excludes, status
    } = body

    await DB.prepare(`
      UPDATE activities
      SET category_id = ?,
          title_en = ?,
          title_ar = ?,
          short_description_en = ?,
          short_description_ar = ?,
          full_description_en = ?,
          full_description_ar = ?,
          images = ?,
          video_url = ?,
          duration_minutes = ?,
          capacity_per_slot = ?,
          price = ?,
          currency = ?,
          price_type = ?,
          requirements = ?,
          includes = ?,
          excludes = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE activity_id = ? AND vendor_id = ?
    `).bind(
      category_id,
      title_en,
      title_ar || title_en,
      short_description_en,
      short_description_ar || short_description_en,
      full_description_en,
      full_description_ar || full_description_en,
      JSON.stringify(images || []),
      video_url || null,
      duration_minutes,
      capacity_per_slot,
      price,
      currency || 'USD',
      price_type || 'per_person',
      JSON.stringify(requirements || []),
      JSON.stringify(includes || []),
      JSON.stringify(excludes || []),
      status || 'active',
      activity_id,
      vendor_id
    ).run()

    return c.json({ success: true, message: 'Activity updated successfully' })
  } catch (error) {
    console.error('Update activity error:', error)
    return c.json({ error: 'Internal server error: ' + error.message }, 500)
  }
})

// Delete activity
app.delete('/api/vendor/activities/:activity_id', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const { activity_id } = c.req.param()

  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }

  try {
    // Verify activity belongs to vendor
    const existing = await DB.prepare(`
      SELECT activity_id FROM activities WHERE activity_id = ? AND vendor_id = ?
    `).bind(activity_id, vendor_id).first()

    if (!existing) {
      return c.json({ error: 'Activity not found or access denied' }, 404)
    }

    // Check for existing bookings
    const bookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings 
      WHERE activity_id = ? AND booking_status != 'cancelled'
    `).bind(activity_id).first()

    if (bookings && bookings.count > 0) {
      return c.json({ 
        error: `Cannot delete activity with ${bookings.count} active booking(s). Please cancel bookings first.`,
        has_bookings: true
      }, 400)
    }

    // Delete the activity
    await DB.prepare(`
      DELETE FROM activities WHERE activity_id = ? AND vendor_id = ?
    `).bind(activity_id, vendor_id).run()

    return c.json({ success: true, message: 'Activity deleted successfully' })
  } catch (error) {
    console.error('Delete activity error:', error)
    return c.json({ error: 'Internal server error: ' + error.message }, 500)
  }
})

// Upload activity image (simulated - returns data URL for now)
app.post('/api/vendor/upload-image', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  try {
    // In production, this would upload to Cloudflare R2
    // For now, we'll return a placeholder URL
    const formData = await c.req.formData()
    const image = formData.get('image')
    
    if (!image) {
      return c.json({ error: 'No image provided' }, 400)
    }
    
    // Generate placeholder image URL
    const timestamp = Date.now()
    const imageUrl = `/static/uploads/${vendor_id}_${timestamp}.jpg`
    
    return c.json({
      success: true,
      image_url: imageUrl,
      message: 'Image uploaded successfully'
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get vendor profile
app.get('/api/vendor/profile', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  console.log('GET /api/vendor/profile - vendor_id:', vendor_id)
  
  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }
  
  try {
    const profile = await DB.prepare(`
      SELECT 
        vendor_id, business_name, slug, email, phone, website,
        profile_image, description, address, city, country,
        operating_hours, social_media, specialties, years_experience,
        languages_spoken, safety_rating, status
      FROM vendors
      WHERE vendor_id = ?
    `).bind(vendor_id).first()
    
    console.log('Profile query result:', profile)
    
    if (!profile) {
      return c.json({ error: 'Vendor not found' }, 404)
    }
    
    return c.json({ profile })
  } catch (error) {
    console.error('Get vendor profile error:', error)
    return c.json({ error: 'Internal server error: ' + error.message }, 500)
  }
})

// Get vendor connected properties
app.get('/api/vendor/properties', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  if (!vendor_id) {
    return c.json({ error: 'Vendor ID not provided' }, 401)
  }
  
  try {
    const properties = await DB.prepare(`
      SELECT 
        vp.vendor_property_id,
        vp.vendor_id,
        vp.property_id,
        vp.status,
        vp.is_featured,
        vp.custom_commission_rate,
        vp.joined_via,
        p.name as property_name,
        p.slug as property_slug,
        p.contact_email as property_email,
        p.contact_phone as property_phone,
        p.address as property_address
      FROM vendor_properties vp
      JOIN properties p ON vp.property_id = p.property_id
      WHERE vp.vendor_id = ?
      ORDER BY vp.is_featured DESC, p.name ASC
    `).bind(vendor_id).all()
    
    return c.json({ properties: properties.results || [] })
  } catch (error) {
    console.error('Get vendor properties error:', error)
    return c.json({ error: 'Internal server error: ' + error.message }, 500)
  }
})

// Update vendor profile
app.put('/api/vendor/profile', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  const body = await c.req.json()
  
  try {
    const {
      business_name, phone, website, description, address, city, country,
      operating_hours, social_media, specialties, years_experience, languages_spoken
    } = body
    
    await DB.prepare(`
      UPDATE vendors
      SET business_name = ?,
          phone = ?,
          website = ?,
          description = ?,
          address = ?,
          city = ?,
          country = ?,
          operating_hours = ?,
          social_media = ?,
          specialties = ?,
          years_experience = ?,
          languages_spoken = ?,
          updated_at = datetime('now')
      WHERE vendor_id = ?
    `).bind(
      business_name, phone, website || null, description || null,
      address || null, city || null, country || null,
      operating_hours ? JSON.stringify(operating_hours) : null,
      social_media ? JSON.stringify(social_media) : null,
      specialties ? JSON.stringify(specialties) : null,
      years_experience || null,
      languages_spoken ? JSON.stringify(languages_spoken) : null,
      vendor_id
    ).run()
    
    return c.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update vendor profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Upload vendor profile image
app.post('/api/vendor/upload-profile-image', async (c) => {
  const { DB } = c.env
  const vendor_id = c.req.header('X-Vendor-ID')
  
  try {
    const formData = await c.req.formData()
    const image = formData.get('image')
    
    if (!image) {
      return c.json({ error: 'No image provided' }, 400)
    }
    
    // Generate placeholder image URL (production: upload to R2)
    const timestamp = Date.now()
    const imageUrl = `/static/vendors/${vendor_id}_profile_${timestamp}.jpg`
    
    // Update vendor profile image
    await DB.prepare(`
      UPDATE vendors SET profile_image = ?, updated_at = datetime('now')
      WHERE vendor_id = ?
    `).bind(imageUrl, vendor_id).run()
    
    return c.json({
      success: true,
      image_url: imageUrl,
      message: 'Profile image uploaded successfully'
    })
  } catch (error) {
    console.error('Profile image upload error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Vendor registration with hotel code
app.post('/api/vendor/register', async (c) => {
  const { DB } = c.env
  const { registration_code, business_name, email, phone, password } = await c.req.json()
  
  try {
    // Validate registration code
    const property = await DB.prepare(`
      SELECT property_id, registration_code_expires_at 
      FROM properties 
      WHERE registration_code = ? AND status = 'active'
    `).bind(registration_code).first()
    
    if (!property) {
      return c.json({ error: 'Invalid registration code' }, 400)
    }
    
    // Check if code is expired
    const expiresAt = new Date(property.registration_code_expires_at)
    if (expiresAt < new Date()) {
      return c.json({ error: 'Registration code has expired' }, 400)
    }
    
    // Check if email already exists
    const existing = await DB.prepare(`
      SELECT vendor_id FROM vendors WHERE email = ?
    `).bind(email).first()
    
    if (existing) {
      return c.json({ error: 'Email already registered' }, 400)
    }
    
    // Create vendor
    const slug = business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const vendor = await DB.prepare(`
      INSERT INTO vendors (business_name, slug, email, phone, password_hash, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      RETURNING vendor_id
    `).bind(business_name, slug, email, phone, password).first()
    
    // Link vendor to property
    await DB.prepare(`
      INSERT INTO vendor_properties (vendor_id, property_id, registration_code_used, joined_via, commission_rate)
      VALUES (?, ?, ?, 'registration_code', 15)
    `).bind(vendor.vendor_id, property.property_id, registration_code).run()
    
    return c.json({
      success: true,
      vendor_id: vendor.vendor_id,
      message: 'Vendor registered successfully'
    })
  } catch (error) {
    console.error('Vendor registration error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// GUEST CALLBACK REQUESTS
// ============================================

// Submit callback request
app.post('/api/callback-request', async (c) => {
  const { DB } = c.env
  const { property_id, activity_id, vendor_id, first_name, last_name, phone, email, preferred_time, message } = await c.req.json()
  
  try {
    const request = await DB.prepare(`
      INSERT INTO callback_requests (
        property_id, activity_id, vendor_id, first_name, last_name, phone, email, preferred_time, message, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      RETURNING request_id
    `).bind(
      property_id, 
      activity_id || null, 
      vendor_id || null, 
      first_name, 
      last_name, 
      phone, 
      email || null, 
      preferred_time || 'anytime', 
      message || null
    ).first()
    
    return c.json({
      success: true,
      request_id: request.request_id,
      message: 'Callback request submitted. We will contact you soon!'
    })
  } catch (error) {
    console.error('Callback request error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// SUPER ADMIN API ENDPOINTS
// ============================================

// Get platform stats
app.get('/api/superadmin/stats', async (c) => {
  const { DB } = c.env
  
  try {
    const hotels = await DB.prepare('SELECT COUNT(*) as count FROM properties').first()
    const vendors = await DB.prepare('SELECT COUNT(*) as count FROM vendors').first()
    const bookings = await DB.prepare('SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM bookings').first()
    
    return c.json({
      total_hotels: hotels.count,
      total_vendors: vendors.count,
      total_bookings: bookings.count,
      total_revenue: bookings.revenue || 0
    })
  } catch (error) {
    console.error('Stats error:', error)
    return c.json({ error: 'Failed to load stats' }, 500)
  }
})

// Get all hotels
app.get('/api/superadmin/hotels', async (c) => {
  const { DB } = c.env
  
  try {
    const hotels = await DB.prepare(`
      SELECT property_id, name as property_name, slug, contact_email, contact_phone, 
             address as location, status, created_at
      FROM properties
      ORDER BY created_at DESC
    `).all()
    
    return c.json(hotels.results)
  } catch (error) {
    console.error('Get hotels error:', error)
    return c.json({ error: 'Failed to load hotels' }, 500)
  }
})

// Add new hotel
app.post('/api/superadmin/hotels', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Create hotel property
    const property = await DB.prepare(`
      INSERT INTO properties (name, slug, contact_email, contact_phone, address, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).bind(
      data.name,
      data.slug,
      data.contact_email,
      data.contact_phone || null,
      data.address || null
    ).run()
    
    // Create admin user for the hotel
    const adminResult = await DB.prepare(`
      INSERT INTO guests (email, name, phone, language_preference)
      VALUES (?, ?, ?, 'en')
    `).bind(data.contact_email, data.name + ' Admin', data.contact_phone || '').run()
    
    // Generate registration code for the hotel
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    
    await DB.prepare(`
      UPDATE properties 
      SET registration_code = ?, registration_code_expires_at = ?
      WHERE property_id = ?
    `).bind(code, expiry.toISOString(), property.meta.last_row_id).run()
    
    return c.json({
      success: true,
      property_id: property.meta.last_row_id,
      registration_code: code,
      message: 'Hotel created successfully'
    })
  } catch (error) {
    console.error('Create hotel error:', error)
    return c.json({ error: 'Failed to create hotel' }, 500)
  }
})

// Get all vendors
app.get('/api/superadmin/vendors', async (c) => {
  const { DB } = c.env
  
  try {
    const vendors = await DB.prepare(`
      SELECT 
        v.*,
        COUNT(DISTINCT vp.property_id) as property_count
      FROM vendors v
      LEFT JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      GROUP BY v.vendor_id
      ORDER BY v.created_at DESC
    `).all()
    
    return c.json(vendors.results)
  } catch (error) {
    console.error('Get vendors error:', error)
    return c.json({ error: 'Failed to load vendors' }, 500)
  }
})

// Get all bookings
app.get('/api/superadmin/bookings', async (c) => {
  const { DB } = c.env
  
  try {
    const bookings = await DB.prepare(`
      SELECT 
        b.*,
        a.title_en as activity_title,
        p.name as property_name
      FROM activity_bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN properties p ON b.property_id = p.property_id
      ORDER BY b.created_at DESC
      LIMIT 100
    `).all()
    
    return c.json(bookings.results)
  } catch (error) {
    console.error('Get bookings error:', error)
    return c.json({ error: 'Failed to load bookings' }, 500)
  }
})

// ============================================
// SUPER ADMIN - USER MANAGEMENT API
// ============================================

// Get all platform users
app.get('/api/superadmin/users', async (c) => {
  const { DB } = c.env
  const user_type = c.req.query('type') // 'hotel', 'vendor', or 'all'
  const status = c.req.query('status') // 'active', 'suspended', etc.
  
  try {
    let query = `
      SELECT 
        pu.*,
        p.name as property_name,
        v.business_name as vendor_business_name
      FROM platform_users pu
      LEFT JOIN properties p ON pu.property_id = p.property_id
      LEFT JOIN vendors v ON pu.vendor_id = v.vendor_id
      WHERE 1=1
    `
    const bindings = []
    
    if (user_type && user_type !== 'all') {
      query += ` AND pu.user_type = ?`
      bindings.push(user_type)
    }
    if (status && status !== 'all') {
      query += ` AND pu.status = ?`
      bindings.push(status)
    }
    
    query += ` ORDER BY pu.created_at DESC LIMIT 1000`
    
    const users = await DB.prepare(query).bind(...bindings).all()
    return c.json({ success: true, users: users.results })
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ error: 'Failed to load users' }, 500)
  }
})

// Suspend/Activate user
app.patch('/api/superadmin/users/:user_id/status', async (c) => {
  const { DB } = c.env
  const { user_id } = c.req.param()
  const { status, reason } = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE platform_users 
      SET status = ?, 
          suspended_at = CASE WHEN ? = 'suspended' THEN CURRENT_TIMESTAMP ELSE NULL END,
          suspended_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(status, status, reason || null, user_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update user status error:', error)
    return c.json({ error: 'Failed to update user status' }, 500)
  }
})

// Delete user
app.delete('/api/superadmin/users/:user_id', async (c) => {
  const { DB } = c.env
  const { user_id } = c.req.param()
  
  try {
    await DB.prepare(`DELETE FROM platform_users WHERE user_id = ?`).bind(user_id).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

// ============================================
// SUPER ADMIN - SUPPORT TICKETS API
// ============================================

// Get all tickets
app.get('/api/superadmin/tickets', async (c) => {
  const { DB } = c.env
  const status = c.req.query('status') || 'all'
  const priority = c.req.query('priority') || 'all'
  
  try {
    let query = `SELECT * FROM support_tickets WHERE 1=1`
    const bindings = []
    
    if (status !== 'all') {
      query += ` AND status = ?`
      bindings.push(status)
    }
    if (priority !== 'all') {
      query += ` AND priority = ?`
      bindings.push(priority)
    }
    
    query += ` ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      created_at DESC
      LIMIT 500`
    
    const tickets = await DB.prepare(query).bind(...bindings).all()
    return c.json({ success: true, tickets: tickets.results })
  } catch (error) {
    console.error('Get tickets error:', error)
    return c.json({ error: 'Failed to load tickets' }, 500)
  }
})

// Create ticket
app.post('/api/tickets', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const ticket_number = 'TKT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase()
    
    const result = await DB.prepare(`
      INSERT INTO support_tickets (
        ticket_number, subject, description, priority, category,
        created_by_type, created_by_id, created_by_email, created_by_name,
        property_id, vendor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ticket_number,
      data.subject,
      data.description,
      data.priority || 'medium',
      data.category || 'general',
      data.created_by_type,
      data.created_by_id,
      data.created_by_email,
      data.created_by_name,
      data.property_id || null,
      data.vendor_id || null
    ).run()
    
    return c.json({ success: true, ticket_id: result.meta.last_row_id, ticket_number })
  } catch (error) {
    console.error('Create ticket error:', error)
    return c.json({ error: 'Failed to create ticket' }, 500)
  }
})

// Update ticket status
app.patch('/api/superadmin/tickets/:ticket_id', async (c) => {
  const { DB } = c.env
  const { ticket_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE support_tickets 
      SET status = ?,
          assigned_to_id = ?,
          assigned_to_name = ?,
          resolved_at = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE ticket_id = ?
    `).bind(
      data.status || 'open',
      data.assigned_to_id || null,
      data.assigned_to_name || null,
      data.status,
      data.status,
      ticket_id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update ticket error:', error)
    return c.json({ error: 'Failed to update ticket' }, 500)
  }
})

// Get ticket messages
app.get('/api/tickets/:ticket_id/messages', async (c) => {
  const { DB } = c.env
  const { ticket_id } = c.req.param()
  
  try {
    const messages = await DB.prepare(`
      SELECT * FROM ticket_messages 
      WHERE ticket_id = ? 
      ORDER BY created_at ASC
    `).bind(ticket_id).all()
    
    return c.json({ success: true, messages: messages.results })
  } catch (error) {
    console.error('Get ticket messages error:', error)
    return c.json({ error: 'Failed to load messages' }, 500)
  }
})

// Add ticket message/reply
app.post('/api/tickets/:ticket_id/messages', async (c) => {
  const { DB } = c.env
  const { ticket_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      INSERT INTO ticket_messages (
        ticket_id, message, is_internal_note,
        author_type, author_id, author_name, author_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ticket_id,
      data.message,
      data.is_internal_note ? 1 : 0,
      data.author_type,
      data.author_id,
      data.author_name,
      data.author_email || null
    ).run()
    
    // Update ticket updated_at
    await DB.prepare(`
      UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?
    `).bind(ticket_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Add ticket message error:', error)
    return c.json({ error: 'Failed to add message' }, 500)
  }
})

// ============================================
// SUPER ADMIN - LIVE CHAT API
// ============================================

// Get chat rooms
app.get('/api/superadmin/chat/rooms', async (c) => {
  const { DB } = c.env
  const status = c.req.query('status') || 'active'
  
  try {
    const rooms = await DB.prepare(`
      SELECT * FROM chat_rooms 
      WHERE status = ? 
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      LIMIT 100
    `).bind(status).all()
    
    return c.json({ success: true, rooms: rooms.results })
  } catch (error) {
    console.error('Get chat rooms error:', error)
    return c.json({ error: 'Failed to load chat rooms' }, 500)
  }
})

// Get user's chat rooms
app.get('/api/chat/rooms', async (c) => {
  const { DB } = c.env
  const user_type = c.req.query('user_type')
  const user_id = c.req.query('user_id')
  
  try {
    const rooms = await DB.prepare(`
      SELECT * FROM chat_rooms 
      WHERE (
        (participant1_type = ? AND participant1_id = ?) OR
        (participant2_type = ? AND participant2_id = ?)
      )
      AND status = 'active'
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
    `).bind(user_type, user_id, user_type, user_id).all()
    
    return c.json({ success: true, rooms: rooms.results })
  } catch (error) {
    console.error('Get user chat rooms error:', error)
    return c.json({ error: 'Failed to load chat rooms' }, 500)
  }
})

// Create chat room
app.post('/api/chat/rooms', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Check if room already exists
    const existing = await DB.prepare(`
      SELECT room_id FROM chat_rooms 
      WHERE (
        (participant1_type = ? AND participant1_id = ? AND participant2_type = ? AND participant2_id = ?) OR
        (participant1_type = ? AND participant1_id = ? AND participant2_type = ? AND participant2_id = ?)
      )
      AND status = 'active'
    `).bind(
      data.participant1_type, data.participant1_id, data.participant2_type, data.participant2_id,
      data.participant2_type, data.participant2_id, data.participant1_type, data.participant1_id
    ).first()
    
    if (existing) {
      return c.json({ success: true, room_id: existing.room_id, existing: true })
    }
    
    const result = await DB.prepare(`
      INSERT INTO chat_rooms (
        room_type, room_name,
        participant1_type, participant1_id, participant1_name,
        participant2_type, participant2_id, participant2_name,
        property_id, vendor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.room_type,
      data.room_name,
      data.participant1_type,
      data.participant1_id,
      data.participant1_name,
      data.participant2_type || 'superadmin',
      data.participant2_id || 1,
      data.participant2_name || 'Support Team',
      data.property_id || null,
      data.vendor_id || null
    ).run()
    
    return c.json({ success: true, room_id: result.meta.last_row_id })
  } catch (error) {
    console.error('Create chat room error:', error)
    return c.json({ error: 'Failed to create chat room' }, 500)
  }
})

// Get chat messages
app.get('/api/chat/rooms/:room_id/messages', async (c) => {
  const { DB } = c.env
  const { room_id } = c.req.param()
  const limit = parseInt(c.req.query('limit') || '50')
  
  try {
    const messages = await DB.prepare(`
      SELECT * FROM chat_messages 
      WHERE room_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(room_id, limit).all()
    
    return c.json({ success: true, messages: messages.results.reverse() })
  } catch (error) {
    console.error('Get chat messages error:', error)
    return c.json({ error: 'Failed to load messages' }, 500)
  }
})

// Send chat message
app.post('/api/chat/rooms/:room_id/messages', async (c) => {
  const { DB } = c.env
  const { room_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      INSERT INTO chat_messages (
        room_id, message, message_type,
        sender_type, sender_id, sender_name
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      room_id,
      data.message,
      data.message_type || 'text',
      data.sender_type,
      data.sender_id,
      data.sender_name
    ).run()
    
    // Update room last_message_at
    await DB.prepare(`
      UPDATE chat_rooms 
      SET last_message_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE room_id = ?
    `).bind(room_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Send chat message error:', error)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// ============================================
// HOTEL ADMIN API ENDPOINTS
// ============================================

// Get callback requests (Admin)
app.get('/api/admin/callback-requests', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  const status = c.req.query('status') || 'pending'
  
  try {
    const requests = await DB.prepare(`
      SELECT * FROM callback_requests
      WHERE property_id = ? AND status = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(property_id, status).all()
    
    return c.json({ requests: requests.results })
  } catch (error) {
    console.error('Get callback requests error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// ADMIN API ROUTES
// ============================================

// Admin login
app.post('/api/admin/login', async (c) => {
  const { DB } = c.env
  const { email, password } = await c.req.json()

  try {
    const user = await DB.prepare(`
      SELECT * FROM users WHERE email = ? AND status = 'active'
    `).bind(email).first()

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Note: In production, use proper bcrypt password verification
    
    return c.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        property_id: user.property_id
      },
      token: `admin-${user.user_id}-${Date.now()}`
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Admin dashboard stats
app.get('/api/admin/dashboard', async (c) => {
  const { DB } = c.env
  const property_id = c.req.header('X-Property-ID')

  try {
    // Today's bookings
    const todayBookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE property_id = ? AND activity_date = date('now')
    `).bind(property_id).first()

    // This month's revenue
    const monthRevenue = await DB.prepare(`
      SELECT SUM(total_price) as revenue FROM bookings
      WHERE property_id = ? 
        AND strftime('%Y-%m', activity_date) = strftime('%Y-%m', 'now')
        AND payment_status = 'paid'
    `).bind(property_id).first()

    // Active vendors
    const activeVendors = await DB.prepare(`
      SELECT COUNT(*) as count FROM vendor_properties vp
      JOIN vendors v ON vp.vendor_id = v.vendor_id
      WHERE vp.property_id = ? AND v.status = 'active'
    `).bind(property_id).first()

    // Guest engagement (QR scans vs bookings)
    const scans = await DB.prepare(`
      SELECT COUNT(*) as count FROM analytics_events
      WHERE property_id = ? AND event_type = 'qr_scan'
        AND date(timestamp) >= date('now', '-30 days')
    `).bind(property_id).first()

    const bookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE property_id = ? AND created_at >= datetime('now', '-30 days')
    `).bind(property_id).first()

    const engagement = scans.count > 0 ? Math.round((bookings.count / scans.count) * 100) : 0

    return c.json({
      kpis: {
        today_bookings: todayBookings.count,
        month_revenue: monthRevenue.revenue || 0,
        active_vendors: activeVendors.count,
        engagement_rate: engagement
      }
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Track QR code scan
app.post('/api/track-scan', async (c) => {
  const { DB } = c.env
  
  try {
    const { property_id } = await c.req.json()
    const user_agent = c.req.header('User-Agent') || ''
    const ip_address = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || ''
    
    await DB.prepare(`
      INSERT INTO qr_scans (property_id, user_agent, ip_address)
      VALUES (?, ?, ?)
    `).bind(property_id || 1, user_agent, ip_address).run()
    
    return c.json({ success: true, message: 'Scan tracked' })
  } catch (error) {
    console.error('Track scan error:', error)
    return c.json({ success: false, error: 'Failed to track scan' }, 500)
  }
})

// Track page view
app.post('/api/track-page-view', async (c) => {
  const { DB } = c.env
  
  try {
    const { property_id, page_type, page_id } = await c.req.json()
    const user_agent = c.req.header('User-Agent') || ''
    
    await DB.prepare(`
      INSERT INTO page_views (property_id, page_type, page_id, user_agent)
      VALUES (?, ?, ?, ?)
    `).bind(property_id || 1, page_type, page_id || null, user_agent).run()
    
    return c.json({ success: true, message: 'Page view tracked' })
  } catch (error) {
    console.error('Track page view error:', error)
    return c.json({ success: false, error: 'Failed to track page view' }, 500)
  }
})

// Get analytics data
app.get('/api/admin/analytics', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id') || '1'
  const dateRange = c.req.query('range') || 'today' // today, yesterday, 7days, 30days, custom
  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')

  try {
    // Calculate date ranges
    let currentStartDate, currentEndDate, previousStartDate, previousEndDate
    
    if (dateRange === 'custom' && startDate && endDate) {
      currentStartDate = startDate
      currentEndDate = endDate
      // Calculate previous period of same length
      const daysDiff = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
      previousEndDate = startDate
      previousStartDate = new Date(new Date(startDate) - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else if (dateRange === 'today') {
      currentStartDate = "date('now')"
      currentEndDate = "date('now')"
      previousStartDate = "date('now', '-1 day')"
      previousEndDate = "date('now', '-1 day')"
    } else if (dateRange === 'yesterday') {
      currentStartDate = "date('now', '-1 day')"
      currentEndDate = "date('now', '-1 day')"
      previousStartDate = "date('now', '-2 days')"
      previousEndDate = "date('now', '-2 days')"
    } else if (dateRange === '7days') {
      currentStartDate = "date('now', '-6 days')"
      currentEndDate = "date('now')"
      previousStartDate = "date('now', '-13 days')"
      previousEndDate = "date('now', '-7 days')"
    } else if (dateRange === '30days') {
      currentStartDate = "date('now', '-29 days')"
      currentEndDate = "date('now')"
      previousStartDate = "date('now', '-59 days')"
      previousEndDate = "date('now', '-30 days')"
    }

    // QR Scans for current period
    const currentScans = await DB.prepare(`
      SELECT COUNT(*) as count FROM qr_scans
      WHERE property_id = ? AND scan_date BETWEEN ${currentStartDate} AND ${currentEndDate}
    `).bind(property_id).first()

    // QR Scans for previous period (for comparison)
    const previousScans = await DB.prepare(`
      SELECT COUNT(*) as count FROM qr_scans
      WHERE property_id = ? AND scan_date BETWEEN ${previousStartDate} AND ${previousEndDate}
    `).bind(property_id).first()

    // Calculate percentage change
    const scansChange = previousScans.count > 0 
      ? ((currentScans.count - previousScans.count) / previousScans.count * 100).toFixed(1)
      : currentScans.count > 0 ? 100 : 0

    // Total activities count
    const activities = await DB.prepare(`
      SELECT COUNT(*) as count FROM activities a
      JOIN vendor_properties vp ON a.vendor_id = vp.vendor_id
      WHERE vp.property_id = ? AND a.status = 'active'
    `).bind(property_id).first()

    // Total vendors count
    const vendors = await DB.prepare(`
      SELECT COUNT(*) as count FROM vendor_properties vp
      JOIN vendors v ON vp.vendor_id = v.vendor_id
      WHERE vp.property_id = ? AND v.status = 'active'
    `).bind(property_id).first()

    // Active bookings for current period
    const currentBookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE property_id = ? AND booking_status IN ('confirmed', 'pending')
        AND booking_date BETWEEN ${currentStartDate} AND ${currentEndDate}
    `).bind(property_id).first()

    // Previous period bookings for comparison
    const previousBookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE property_id = ? AND booking_status IN ('confirmed', 'pending')
        AND booking_date BETWEEN ${previousStartDate} AND ${previousEndDate}
    `).bind(property_id).first()

    const bookingsChange = previousBookings.count > 0
      ? ((currentBookings.count - previousBookings.count) / previousBookings.count * 100).toFixed(1)
      : currentBookings.count > 0 ? 100 : 0

    // Most popular activities (by bookings in current period)
    const popularActivities = await DB.prepare(`
      SELECT 
        a.title_en,
        a.activity_id,
        COUNT(b.booking_id) as booking_count,
        SUM(b.total_price) as total_revenue
      FROM activities a
      JOIN vendor_properties vp ON a.vendor_id = vp.vendor_id
      LEFT JOIN bookings b ON a.activity_id = b.activity_id 
        AND b.booking_date BETWEEN ${currentStartDate} AND ${currentEndDate}
      WHERE vp.property_id = ?
      GROUP BY a.activity_id
      HAVING booking_count > 0
      ORDER BY booking_count DESC
      LIMIT 5
    `).bind(property_id).all()

    // Most viewed sections (from page_views table)
    const popularSections = await DB.prepare(`
      SELECT 
        page_type as name,
        COUNT(*) as views
      FROM page_views
      WHERE property_id = ? AND view_date BETWEEN ${currentStartDate} AND ${currentEndDate}
      GROUP BY page_type
      ORDER BY views DESC
      LIMIT 5
    `).bind(property_id).all()

    // Add icons for sections
    const sectionIcons = {
      'activities': 'hiking',
      'restaurants': 'utensils',
      'spa': 'spa',
      'events': 'calendar',
      'rooms': 'bed',
      'custom': 'layer-group'
    }

    const sectionsWithIcons = (popularSections.results || []).map(s => ({
      ...s,
      icon: sectionIcons[s.name] || 'eye'
    }))

    return c.json({
      stats: {
        totalScans: currentScans.count,
        scansChange: scansChange,
        scansPrevious: previousScans.count,
        totalActivities: activities.count,
        totalVendors: vendors.count,
        activeBookings: currentBookings.count,
        bookingsChange: bookingsChange,
        bookingsPrevious: previousBookings.count
      },
      popularActivities: popularActivities.results || [],
      popularSections: sectionsWithIcons,
      dateRange: {
        current: { start: currentStartDate, end: currentEndDate },
        previous: { start: previousStartDate, end: previousEndDate }
      }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all rooms
app.get('/api/admin/rooms', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id') || c.req.header('X-Property-ID')

  try {
    const rooms = await DB.prepare(`
      SELECT * FROM rooms WHERE property_id = ?
      ORDER BY room_number
    `).bind(property_id).all()

    return c.json(rooms.results)
  } catch (error) {
    console.error('Get rooms error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create new room
app.post('/api/admin/rooms', async (c) => {
  const { DB } = c.env
  const property_id = c.req.header('X-Property-ID')
  const { room_number, room_type } = await c.req.json()

  try {
    const qr_code_data = `qr-${room_number}-${crypto.randomUUID()}`

    const room = await DB.prepare(`
      INSERT INTO rooms (property_id, room_number, room_type, qr_code_data, status)
      VALUES (?, ?, ?, ?, 'vacant')
      RETURNING room_id, qr_code_data
    `).bind(property_id, room_number, room_type || 'standard', qr_code_data).first()

    return c.json({
      success: true,
      room_id: room.room_id,
      qr_code_data: room.qr_code_data,
      qr_code_url: `/api/qr/${room.qr_code_data}`
    })
  } catch (error) {
    console.error('Create room error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Regenerate room QR code
app.post('/api/admin/rooms/:room_id/regenerate-qr', async (c) => {
  const { DB } = c.env
  const { room_id } = c.req.param()

  try {
    const room = await DB.prepare(`
      SELECT room_number FROM rooms WHERE room_id = ?
    `).bind(room_id).first()

    if (!room) {
      return c.json({ error: 'Room not found' }, 404)
    }

    const new_qr_code_data = `qr-${room.room_number}-${crypto.randomUUID()}`

    await DB.prepare(`
      UPDATE rooms
      SET qr_code_data = ?, updated_at = datetime('now')
      WHERE room_id = ?
    `).bind(new_qr_code_data, room_id).run()

    return c.json({
      success: true,
      qr_code_data: new_qr_code_data,
      qr_code_url: `/api/qr/${new_qr_code_data}`
    })
  } catch (error) {
    console.error('Regenerate QR error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// QR Card Designer - Get QR card template
app.get('/api/admin/qr-card/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()

  try {
    const card = await DB.prepare(`
      SELECT * FROM qr_card_templates WHERE property_id = ?
    `).bind(property_id).first()

    if (!card) {
      // Return default template if none exists
      return c.json({
        property_id,
        card_title: 'Scan for Hotel Services',
        card_subtitle: 'Access all amenities and services',
        background_color: '#ffffff',
        text_color: '#000000',
        qr_size: 300,
        border_radius: 10,
        show_logo: true,
        festive_overlay: null,
        custom_message: null
      })
    }

    return c.json(card)
  } catch (error) {
    console.error('Get QR card error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// QR Card Designer - Save/Update QR card template
app.put('/api/admin/qr-card/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const {
    card_title,
    card_subtitle,
    background_color,
    text_color,
    qr_size,
    border_radius,
    show_logo,
    festive_overlay,
    custom_message
  } = await c.req.json()

  try {
    // Check if template exists
    const existing = await DB.prepare(`
      SELECT template_id FROM qr_card_templates WHERE property_id = ?
    `).bind(property_id).first()

    if (existing) {
      // Update existing template
      await DB.prepare(`
        UPDATE qr_card_templates 
        SET card_title = ?,
            card_subtitle = ?,
            background_color = ?,
            text_color = ?,
            qr_size = ?,
            border_radius = ?,
            show_logo = ?,
            festive_overlay = ?,
            custom_message = ?,
            updated_at = datetime('now')
        WHERE property_id = ?
      `).bind(
        card_title,
        card_subtitle,
        background_color,
        text_color,
        qr_size,
        border_radius,
        show_logo ? 1 : 0,
        festive_overlay,
        custom_message,
        property_id
      ).run()
    } else {
      // Insert new template
      await DB.prepare(`
        INSERT INTO qr_card_templates (
          property_id, card_title, card_subtitle, background_color,
          text_color, qr_size, border_radius, show_logo,
          festive_overlay, custom_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        property_id,
        card_title,
        card_subtitle,
        background_color,
        text_color,
        qr_size,
        border_radius,
        show_logo ? 1 : 0,
        festive_overlay,
        custom_message
      ).run()
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Save QR card error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get all vendors
app.get('/api/admin/vendors', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')

  try {
    let query = `
      SELECT 
        v.*,
        c.name_en as category_name
      FROM vendors v
      LEFT JOIN categories c ON v.category_id = c.category_id
    `
    
    // If property_id provided, filter by vendor-property relationship
    if (property_id) {
      query += `
        INNER JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
        WHERE vp.property_id = ?
      `
    }
    
    query += ` ORDER BY v.created_at DESC`
    
    const vendors = property_id 
      ? await DB.prepare(query).bind(property_id).all()
      : await DB.prepare(query).all()

    return c.json(vendors.results)
  } catch (error) {
    console.error('Get vendors error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update vendor status
app.patch('/api/admin/vendors/:vendor_id', async (c) => {
  const { DB } = c.env
  const { vendor_id } = c.req.param()
  const { status, commission_rate } = await c.req.json()

  try {
    await DB.prepare(`
      UPDATE vendors
      SET status = ?, commission_rate = COALESCE(?, commission_rate), updated_at = datetime('now')
      WHERE vendor_id = ?
    `).bind(status, commission_rate, vendor_id).run()

    return c.json({ success: true, message: 'Vendor updated successfully' })
  } catch (error) {
    console.error('Update vendor error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get property registration code
app.get('/api/admin/registration-code', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const property = await DB.prepare(`
      SELECT registration_code, registration_code_expires_at
      FROM properties
      WHERE property_id = ?
    `).bind(property_id).first()
    
    return c.json({
      registration_code: property.registration_code,
      expires_at: property.registration_code_expires_at
    })
  } catch (error) {
    console.error('Get registration code error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Regenerate property registration code
app.post('/api/admin/regenerate-registration-code', async (c) => {
  const { DB } = c.env
  const { property_id } = await c.req.json()
  
  try {
    // Generate new 8-character code
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // Expires in 30 days
    
    await DB.prepare(`
      UPDATE properties
      SET registration_code = ?,
          registration_code_expires_at = ?
      WHERE property_id = ?
    `).bind(newCode, expiresAt.toISOString(), property_id).run()
    
    return c.json({
      success: true,
      registration_code: newCode,
      expires_at: expiresAt.toISOString()
    })
  } catch (error) {
    console.error('Regenerate registration code error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get property design settings
app.get('/api/admin/property-settings', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const property = await DB.prepare(`
      SELECT 
        slug, name, tagline, contact_email, contact_phone, address,
        brand_logo_url, hero_image_url, hero_image_effect, hero_overlay_opacity,
        primary_color, secondary_color, accent_color,
        layout_style, font_family, button_style, card_style, header_style, use_gradient,
        hotel_map_url, homepage_section_order, 
        show_restaurants, show_events, show_spa, show_service, show_activities, show_hotel_map,
        section_restaurants_en, section_restaurants_ar, section_restaurants_de, section_restaurants_ru, section_restaurants_pl, section_restaurants_it, section_restaurants_fr, section_restaurants_cs, section_restaurants_uk,
        section_events_en, section_events_ar, section_events_de, section_events_ru, section_events_pl, section_events_it, section_events_fr, section_events_cs, section_events_uk,
        section_spa_en, section_spa_ar, section_spa_de, section_spa_ru, section_spa_pl, section_spa_it, section_spa_fr, section_spa_cs, section_spa_uk,
        section_service_en, section_service_ar, section_service_de, section_service_ru, section_service_pl, section_service_it, section_service_fr, section_service_cs, section_service_uk,
        section_activities_en, section_activities_ar, section_activities_de, section_activities_ru, section_activities_pl, section_activities_it, section_activities_fr, section_activities_cs, section_activities_uk
      FROM properties
      WHERE property_id = ?
    `).bind(property_id).first()
    
    // Provide defaults for visibility settings
    const settingsWithDefaults = {
      ...property,
      show_restaurants: property.show_restaurants ?? 1,
      show_events: property.show_events ?? 1,
      show_spa: property.show_spa ?? 1,
      show_service: property.show_service ?? 1,
      show_activities: property.show_activities ?? 1,
      show_hotel_map: property.show_hotel_map ?? 0,
      homepage_section_order: property.homepage_section_order || JSON.stringify(['restaurants', 'events', 'spa', 'service', 'activities'])
    }
    
    return c.json(settingsWithDefaults)
  } catch (error) {
    console.error('Get property settings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update property design settings
app.put('/api/admin/property-settings', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE properties
      SET name = ?,
          tagline = ?,
          contact_email = ?,
          contact_phone = ?,
          address = ?,
          section_restaurants_en = ?,
          section_events_en = ?,
          section_spa_en = ?,
          section_service_en = ?,
          section_activities_en = ?,
          brand_logo_url = ?,
          hero_image_url = ?,
          hero_image_effect = ?,
          hero_overlay_opacity = ?,
          primary_color = ?,
          secondary_color = ?,
          accent_color = ?,
          layout_style = ?,
          font_family = ?,
          button_style = ?,
          card_style = ?,
          header_style = ?,
          use_gradient = ?,
          hotel_map_url = ?,
          homepage_section_order = ?,
          show_restaurants = ?,
          show_events = ?,
          show_spa = ?,
          show_service = ?,
          show_activities = ?,
          show_hotel_map = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ?
    `).bind(
      data.name,
      data.tagline,
      data.contact_email,
      data.contact_phone,
      data.address,
      data.section_restaurants_en,
      data.section_events_en,
      data.section_spa_en,
      data.section_service_en,
      data.section_activities_en,
      data.brand_logo_url,
      data.hero_image_url,
      data.hero_image_effect,
      data.hero_overlay_opacity,
      data.primary_color,
      data.secondary_color,
      data.accent_color,
      data.layout_style,
      data.font_family,
      data.button_style,
      data.card_style,
      data.header_style,
      data.use_gradient,
      data.hotel_map_url,
      data.homepage_section_order,
      data.show_restaurants,
      data.show_events,
      data.show_spa,
      data.show_service,
      data.show_activities,
      data.show_hotel_map,
      data.property_id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update property settings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// CUSTOM SECTIONS APIs
// ============================================

// Get all custom sections for a property
app.get('/api/admin/custom-sections', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const sections = await DB.prepare(`
      SELECT * FROM custom_sections
      WHERE property_id = ?
      ORDER BY display_order ASC, section_id ASC
    `).bind(property_id).all()
    
    return c.json({ success: true, sections: sections.results })
  } catch (error) {
    console.error('Get custom sections error:', error)
    return c.json({ error: 'Failed to get custom sections' }, 500)
  }
})

// Create new custom section
app.post('/api/admin/custom-sections', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO custom_sections (
        property_id, section_key, section_name_en, icon_class, color_class, display_order, is_visible
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.property_id,
      data.section_key,
      data.section_name_en,
      data.icon_class || 'fas fa-star',
      data.color_class || 'blue',
      data.display_order || 0,
      data.is_visible !== undefined ? data.is_visible : 1
    ).run()
    
    return c.json({ success: true, section_id: result.meta.last_row_id })
  } catch (error) {
    console.error('Create custom section error:', error)
    return c.json({ error: 'Failed to create custom section' }, 500)
  }
})

// Update custom section
app.put('/api/admin/custom-sections/:section_id', async (c) => {
  const { DB } = c.env
  const { section_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    // Support partial updates - only update if_visible if that's all that's provided
    if (Object.keys(data).length === 1 && data.hasOwnProperty('is_visible')) {
      await DB.prepare(`
        UPDATE custom_sections
        SET is_visible = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE section_id = ?
      `).bind(data.is_visible, section_id).run()
    } else {
      // Full update
      await DB.prepare(`
        UPDATE custom_sections
        SET section_name_en = ?,
            section_name_ar = ?,
            section_name_de = ?,
            section_name_ru = ?,
            section_name_pl = ?,
            section_name_it = ?,
            section_name_fr = ?,
            section_name_cs = ?,
            section_name_uk = ?,
            icon_class = ?,
            color_class = ?,
            display_order = ?,
            is_visible = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE section_id = ?
      `).bind(
        data.section_name_en,
        data.section_name_ar || null,
        data.section_name_de || null,
        data.section_name_ru || null,
        data.section_name_pl || null,
        data.section_name_it || null,
        data.section_name_fr || null,
        data.section_name_cs || null,
        data.section_name_uk || null,
        data.icon_class,
        data.color_class,
        data.display_order,
        data.is_visible,
        section_id
      ).run()
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update custom section error:', error)
    return c.json({ error: 'Failed to update custom section' }, 500)
  }
})

// Delete custom section
app.delete('/api/admin/custom-sections/:section_id', async (c) => {
  const { DB } = c.env
  const { section_id } = c.req.param()
  
  try {
    await DB.prepare(`
      DELETE FROM custom_sections WHERE section_id = ?
    `).bind(section_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete custom section error:', error)
    return c.json({ error: 'Failed to delete custom section' }, 500)
  }
})

// Get custom sections for hotel homepage (public)
app.get('/api/custom-sections/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  
  try {
    const sections = await DB.prepare(`
      SELECT * FROM custom_sections
      WHERE property_id = ? AND is_visible = 1
      ORDER BY display_order ASC, section_id ASC
    `).bind(property_id).all()
    
    return c.json({ success: true, sections: sections.results })
  } catch (error) {
    console.error('Get custom sections error:', error)
    return c.json({ error: 'Failed to get custom sections' }, 500)
  }
})

// ============================================
// INFO PAGES API ENDPOINTS
// ============================================

// Get all info pages for a property (admin)
app.get('/api/admin/info-pages', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const pages = await DB.prepare(`
      SELECT * FROM info_pages
      WHERE property_id = ?
      ORDER BY display_order ASC, page_id DESC
    `).bind(property_id).all()
    
    return c.json(pages.results)
  } catch (error) {
    console.error('Get info pages error:', error)
    return c.json({ error: 'Failed to get info pages' }, 500)
  }
})

// Get single info page by ID (admin)
app.get('/api/admin/info-pages/:page_id', async (c) => {
  const { DB } = c.env
  const { page_id } = c.req.param()
  
  try {
    const page = await DB.prepare(`
      SELECT * FROM info_pages WHERE page_id = ?
    `).bind(page_id).first()
    
    if (!page) {
      return c.json({ error: 'Info page not found' }, 404)
    }
    
    return c.json(page)
  } catch (error) {
    console.error('Get info page error:', error)
    return c.json({ error: 'Failed to get info page' }, 500)
  }
})

// Create new info page
app.post('/api/admin/info-pages', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO info_pages (
        property_id, page_key, title_en, content_en, 
        icon_class, color_theme, layout_type, is_published, 
        display_order, show_in_menu
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.property_id,
      data.page_key || 'page-' + Date.now(),
      data.title_en,
      data.content_en,
      data.icon_class || 'fas fa-info-circle',
      data.color_theme || 'blue',
      data.layout_type || 'single-column',
      data.is_published !== undefined ? data.is_published : 1,
      data.display_order || 0,
      data.show_in_menu !== undefined ? data.show_in_menu : 1
    ).run()
    
    return c.json({ success: true, page_id: result.meta.last_row_id })
  } catch (error) {
    console.error('Create info page error:', error)
    return c.json({ error: 'Failed to create info page' }, 500)
  }
})

// Update info page
app.put('/api/admin/info-pages/:page_id', async (c) => {
  const { DB } = c.env
  const { page_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    
    if (data.title_en !== undefined) { updates.push('title_en = ?'); values.push(data.title_en); }
    if (data.content_en !== undefined) { updates.push('content_en = ?'); values.push(data.content_en); }
    if (data.icon_class !== undefined) { updates.push('icon_class = ?'); values.push(data.icon_class); }
    if (data.color_theme !== undefined) { updates.push('color_theme = ?'); values.push(data.color_theme); }
    if (data.layout_type !== undefined) { updates.push('layout_type = ?'); values.push(data.layout_type); }
    if (data.is_published !== undefined) { updates.push('is_published = ?'); values.push(data.is_published); }
    if (data.display_order !== undefined) { updates.push('display_order = ?'); values.push(data.display_order); }
    if (data.show_in_menu !== undefined) { updates.push('show_in_menu = ?'); values.push(data.show_in_menu); }
    
    // Add multilingual fields
    const languages = ['ar', 'de', 'ru', 'pl', 'it', 'fr', 'cs', 'uk', 'zh'];
    languages.forEach(lang => {
      if (data[`title_${lang}`] !== undefined) {
        updates.push(`title_${lang} = ?`);
        values.push(data[`title_${lang}`]);
      }
      if (data[`content_${lang}`] !== undefined) {
        updates.push(`content_${lang} = ?`);
        values.push(data[`content_${lang}`]);
      }
    });
    
    updates.push('updated_at = datetime(\'now\')');
    values.push(page_id);
    
    await DB.prepare(`
      UPDATE info_pages SET ${updates.join(', ')} WHERE page_id = ?
    `).bind(...values).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update info page error:', error)
    return c.json({ error: 'Failed to update info page' }, 500)
  }
})

// Delete info page
app.delete('/api/admin/info-pages/:page_id', async (c) => {
  const { DB } = c.env
  const { page_id } = c.req.param()
  
  try {
    await DB.prepare(`
      DELETE FROM info_pages WHERE page_id = ?
    `).bind(page_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete info page error:', error)
    return c.json({ error: 'Failed to delete info page' }, 500)
  }
})

// Get published info pages for guests (public)
app.get('/api/info-pages/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  
  try {
    const pages = await DB.prepare(`
      SELECT page_id, page_key, title_en, title_ar, title_de, title_ru, 
             title_pl, title_it, title_fr, title_cs, title_uk, title_zh,
             icon_class, color_theme, display_order
      FROM info_pages
      WHERE property_id = ? AND is_published = 1 AND show_in_menu = 1
      ORDER BY display_order ASC, page_id ASC
    `).bind(property_id).all()
    
    return c.json({ success: true, pages: pages.results })
  } catch (error) {
    console.error('Get info pages error:', error)
    return c.json({ error: 'Failed to get info pages' }, 500)
  }
})

// Get single info page content for display (public)
app.get('/api/info-page/:property_id/:page_key', async (c) => {
  const { DB } = c.env
  const { property_id, page_key } = c.req.param()
  
  try {
    const page = await DB.prepare(`
      SELECT * FROM info_pages
      WHERE property_id = ? AND page_key = ? AND is_published = 1
    `).bind(property_id, page_key).first()
    
    if (!page) {
      return c.json({ error: 'Info page not found' }, 404)
    }
    
    return c.json({ success: true, page })
  } catch (error) {
    console.error('Get info page error:', error)
    return c.json({ error: 'Failed to get info page' }, 500)
  }
})

// Get all bookings (admin view)
app.get('/api/admin/bookings', async (c) => {
  const { DB } = c.env
  const property_id = c.req.header('X-Property-ID')

  try {
    const bookings = await DB.prepare(`
      SELECT 
        b.*,
        a.title_en as activity_title,
        v.business_name as vendor_name,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM bookings b
      JOIN activities a ON b.activity_id = a.activity_id
      JOIN vendors v ON b.vendor_id = v.vendor_id
      JOIN guests g ON b.guest_id = g.guest_id
      WHERE b.property_id = ?
      ORDER BY b.created_at DESC
      LIMIT 100
    `).bind(property_id).all()

    return c.json({ bookings: bookings.results })
  } catch (error) {
    console.error('Admin bookings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create hotel offering (Admin) - with auto-translation
app.post('/api/admin/offerings', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Insert the offering first
    const result = await DB.prepare(`
      INSERT INTO hotel_offerings (
        property_id, offering_type, custom_section_key, title_en, short_description_en, full_description_en,
        images, video_url, price, currency, duration_minutes, requires_booking, location,
        event_date, event_start_time, event_end_time, status, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, 'active', 0)
    `).bind(
      data.property_id,
      data.offering_type,
      data.custom_section_key || null,
      data.title_en,
      data.short_description_en,
      data.full_description_en,
      data.images,
      data.video_url || null,
      data.price || 0,
      data.duration_minutes,
      data.requires_booking ? 1 : 0,
      data.location,
      data.event_date,
      data.event_start_time,
      data.event_end_time
    ).run()
    
    const offering_id = result.meta.last_row_id
    
    // Auto-translate to all languages in background
    const apiKey = c.env.OPENAI_API_KEY
    if (apiKey) {
      // Translate in background (don't wait for it)
      c.executionCtx.waitUntil((async () => {
        try {
          // Only translate to languages that exist in DB schema
          const languages = ['ar', 'de', 'ru', 'pl', 'it', 'fr', 'cs', 'uk']
          const translations: any = {}
          
          for (const lang of languages) {
            const textsToTranslate = [
              data.title_en,
              data.short_description_en || '',
              data.full_description_en || ''
            ]
            
            const translated = await translateWithAI(textsToTranslate, lang, apiKey)
            
            translations['title_' + lang] = translated[0] || data.title_en
            translations['short_description_' + lang] = translated[1] || data.short_description_en
            translations['full_description_' + lang] = translated[2] || data.full_description_en
          }
          
          // Update database with translations (ar, de, ru, pl, it, fr, cs, uk)
          await DB.prepare(`
            UPDATE hotel_offerings SET
              title_ar = ?, short_description_ar = ?, full_description_ar = ?,
              title_de = ?, short_description_de = ?, full_description_de = ?,
              title_ru = ?, short_description_ru = ?, full_description_ru = ?,
              title_pl = ?, short_description_pl = ?, full_description_pl = ?,
              title_it = ?, short_description_it = ?, full_description_it = ?,
              title_fr = ?, short_description_fr = ?, full_description_fr = ?,
              title_cs = ?, short_description_cs = ?, full_description_cs = ?,
              title_uk = ?, short_description_uk = ?, full_description_uk = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE offering_id = ?
          `).bind(
            translations.title_ar, translations.short_description_ar, translations.full_description_ar,
            translations.title_de, translations.short_description_de, translations.full_description_de,
            translations.title_ru, translations.short_description_ru, translations.full_description_ru,
            translations.title_pl, translations.short_description_pl, translations.full_description_pl,
            translations.title_it, translations.short_description_it, translations.full_description_it,
            translations.title_fr, translations.short_description_fr, translations.full_description_fr,
            translations.title_cs, translations.short_description_cs, translations.full_description_cs,
            translations.title_uk, translations.short_description_uk, translations.full_description_uk,
            offering_id
          ).run()
          
          console.log('Auto-translated offering ' + offering_id + ' to 8 languages')
        } catch (error) {
          console.error('Background translation error:', error)
        }
      })())
    }
    
    // If restaurant and menus provided, save them
    if (data.offering_type === 'restaurant' && data.menu_urls && data.menu_urls.length > 0) {
      for (let i = 0; i < data.menu_urls.length; i++) {
        const menuUrl = data.menu_urls[i].trim()
        if (menuUrl) {
          await DB.prepare(`
            INSERT INTO restaurant_menus (
              offering_id, menu_name, menu_url, menu_type, display_order, is_active
            ) VALUES (?, ?, ?, 'full', ?, 1)
          `).bind(offering_id, 'Menu ' + (i + 1), menuUrl, i).run()
        }
      }
    }
    
    return c.json({ 
      success: true,
      offering_id: offering_id,
      message: apiKey ? 'Offering created and being translated to 8 languages' : 'Offering created'
    })
  } catch (error) {
    console.error('Create offering error:', error)
    return c.json({ error: 'Failed to create offering' }, 500)
  }
})

// Update hotel offering (Admin)
app.put('/api/admin/offerings/:offering_id', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE hotel_offerings SET
        title_en = ?, short_description_en = ?, full_description_en = ?,
        price = ?, location = ?, duration_minutes = ?,
        requires_booking = ?, images = ?, video_url = ?,
        event_date = ?, event_start_time = ?, event_end_time = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE offering_id = ?
    `).bind(
      data.title_en,
      data.short_description_en,
      data.full_description_en,
      data.price || 0,
      data.location,
      data.duration_minutes,
      data.requires_booking ? 1 : 0,
      data.images,
      data.video_url || null,
      data.event_date,
      data.event_start_time,
      data.event_end_time,
      offering_id
    ).run()
    
    // Update restaurant menus if provided
    if (data.offering_type === 'restaurant' && data.menu_urls !== undefined) {
      // Delete existing menus
      await DB.prepare(`
        DELETE FROM restaurant_menus WHERE offering_id = ?
      `).bind(offering_id).run()
      
      // Insert new menus
      if (data.menu_urls && data.menu_urls.length > 0) {
        for (let i = 0; i < data.menu_urls.length; i++) {
          const menuUrl = data.menu_urls[i].trim()
          if (menuUrl) {
            await DB.prepare(`
              INSERT INTO restaurant_menus (
                offering_id, menu_name, menu_url, menu_type, display_order, is_active
              ) VALUES (?, ?, ?, 'full', ?, 1)
            `).bind(offering_id, 'Menu ' + (i + 1), menuUrl, i).run()
          }
        }
      }
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update offering error:', error)
    return c.json({ error: 'Failed to update offering' }, 500)
  }
})

// Delete hotel offering (Admin)
app.delete('/api/admin/offerings/:offering_id', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  
  console.log('DELETE request for offering_id:', offering_id)
  
  if (!offering_id) {
    return c.json({ error: 'Offering ID is required' }, 400)
  }
  
  try {
    // First check if offering exists
    const existing = await DB.prepare(`
      SELECT offering_id, title_en, offering_type FROM hotel_offerings WHERE offering_id = ?
    `).bind(offering_id).first()
    
    console.log('Found offering to delete:', existing)
    
    if (!existing) {
      return c.json({ error: 'Offering not found' }, 404)
    }
    
    // Check for related bookings
    const bookings = await DB.prepare(`
      SELECT COUNT(*) as count FROM offering_bookings WHERE offering_id = ?
    `).bind(offering_id).first()
    
    if (bookings && bookings.count > 0) {
      return c.json({ 
        error: `Cannot delete offering with ${bookings.count} existing booking(s). Please cancel or complete bookings first.`,
        has_bookings: true,
        booking_count: bookings.count
      }, 400)
    }
    
    // Delete related records in correct order (deepest child tables first)
    console.log('Deleting related records for offering_id:', offering_id)
    
    // 1. Delete table_reservations (references dining_sessions and restaurant_tables)
    const reservationsResult = await DB.prepare(`
      DELETE FROM table_reservations 
      WHERE session_id IN (SELECT session_id FROM dining_sessions WHERE offering_id = ?)
         OR table_id IN (SELECT table_id FROM restaurant_tables WHERE offering_id = ?)
    `).bind(offering_id, offering_id).run()
    console.log('Deleted table_reservations:', reservationsResult)
    
    // 2. Delete session_templates
    await DB.prepare(`
      DELETE FROM session_templates WHERE offering_id = ?
    `).bind(offering_id).run()
    
    // 3. Delete restaurant_layouts
    await DB.prepare(`
      DELETE FROM restaurant_layouts WHERE offering_id = ?
    `).bind(offering_id).run()
    
    // 4. Delete dining_sessions
    await DB.prepare(`
      DELETE FROM dining_sessions WHERE offering_id = ?
    `).bind(offering_id).run()
    
    // 5. Delete restaurant_tables
    await DB.prepare(`
      DELETE FROM restaurant_tables WHERE offering_id = ?
    `).bind(offering_id).run()
    
    // 6. Delete offering_schedule
    await DB.prepare(`
      DELETE FROM offering_schedule WHERE offering_id = ?
    `).bind(offering_id).run()
    
    // 7. Delete restaurant_menus
    await DB.prepare(`
      DELETE FROM restaurant_menus WHERE offering_id = ?
    `).bind(offering_id).run()
    
    // 8. Finally delete the offering itself
    const result = await DB.prepare(`
      DELETE FROM hotel_offerings WHERE offering_id = ?
    `).bind(offering_id).run()
    
    console.log('Delete offering result:', result)
    
    return c.json({ 
      success: true, 
      message: `Successfully deleted ${existing.offering_type}: ${existing.title_en}` 
    })
  } catch (error) {
    console.error('Delete offering error:', error)
    return c.json({ error: 'Failed to delete offering: ' + error.message }, 500)
  }
})

// Auto-translate offering to all languages (Admin)
app.post('/api/admin/offerings/:offering_id/translate', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  const { openai_api_key } = await c.req.json()
  
  if (!openai_api_key) {
    return c.json({ error: 'OpenAI API key required' }, 400)
  }
  
  try {
    // Get the offering
    const offering: any = await DB.prepare(`
      SELECT title_en, short_description_en, full_description_en
      FROM hotel_offerings WHERE offering_id = ?
    `).bind(offering_id).first()
    
    if (!offering) {
      return c.json({ error: 'Offering not found' }, 404)
    }
    
    // Translate to all languages
    const languages = ['ar', 'de', 'ru', 'pl', 'it', 'fr', 'cs', 'uk']
    const translations: any = {}
    
    for (const lang of languages) {
      const textsToTranslate = [
        offering.title_en,
        offering.short_description_en || '',
        offering.full_description_en || ''
      ]
      
      const translated = await translateWithAI(textsToTranslate, lang, openai_api_key)
      
      translations[`title_${lang}`] = translated[0] || offering.title_en
      translations[`short_description_${lang}`] = translated[1] || offering.short_description_en
      translations[`full_description_${lang}`] = translated[2] || offering.full_description_en
    }
    
    // Update database with translations
    await DB.prepare(`
      UPDATE hotel_offerings SET
        title_ar = ?, short_description_ar = ?, full_description_ar = ?,
        title_de = ?, short_description_de = ?, full_description_de = ?,
        title_ru = ?, short_description_ru = ?, full_description_ru = ?,
        title_pl = ?, short_description_pl = ?, full_description_pl = ?,
        title_it = ?, short_description_it = ?, full_description_it = ?,
        title_fr = ?, short_description_fr = ?, full_description_fr = ?,
        title_cs = ?, short_description_cs = ?, full_description_cs = ?,
        title_uk = ?, short_description_uk = ?, full_description_uk = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE offering_id = ?
    `).bind(
      translations.title_ar, translations.short_description_ar, translations.full_description_ar,
      translations.title_de, translations.short_description_de, translations.full_description_de,
      translations.title_ru, translations.short_description_ru, translations.full_description_ru,
      translations.title_pl, translations.short_description_pl, translations.full_description_pl,
      translations.title_it, translations.short_description_it, translations.full_description_it,
      translations.title_fr, translations.short_description_fr, translations.full_description_fr,
      translations.title_cs, translations.short_description_cs, translations.full_description_cs,
      translations.title_uk, translations.short_description_uk, translations.full_description_uk,
      offering_id
    ).run()
    
    return c.json({ 
      success: true,
      translations: translations,
      message: 'Translated to 8 languages successfully'
    })
  } catch (error) {
    console.error('Translation error:', error)
    return c.json({ error: 'Translation failed: ' + error }, 500)
  }
})

// Batch translate ALL offerings to all languages (Admin)
app.post('/api/admin/offerings/translate-all', async (c) => {
  const { DB } = c.env
  const { property_id, openai_api_key } = await c.req.json()
  
  if (!openai_api_key) {
    return c.json({ error: 'OpenAI API key required' }, 400)
  }
  
  try {
    // Get all offerings for this property
    const offerings: any = await DB.prepare(`
      SELECT offering_id, title_en, short_description_en, full_description_en
      FROM hotel_offerings 
      WHERE property_id = ?
    `).bind(property_id).all()
    
    if (!offerings.results || offerings.results.length === 0) {
      return c.json({ error: 'No offerings found' }, 404)
    }
    
    const languages = ['ar', 'de', 'ru', 'pl', 'it', 'fr', 'cs', 'uk']
    let translatedCount = 0
    let failedCount = 0
    
    // Translate each offering
    for (const offering of offerings.results) {
      try {
        const translations: any = {}
        
        // Translate to all languages
        for (const lang of languages) {
          const textsToTranslate = [
            offering.title_en,
            offering.short_description_en || '',
            offering.full_description_en || ''
          ]
          
          const translated = await translateWithAI(textsToTranslate, lang, openai_api_key)
          
          translations['title_' + lang] = translated[0] || offering.title_en
          translations['short_description_' + lang] = translated[1] || offering.short_description_en
          translations['full_description_' + lang] = translated[2] || offering.full_description_en
        }
        
        // Update database with translations
        await DB.prepare(`
          UPDATE hotel_offerings SET
            title_ar = ?, short_description_ar = ?, full_description_ar = ?,
            title_de = ?, short_description_de = ?, full_description_de = ?,
            title_ru = ?, short_description_ru = ?, full_description_ru = ?,
            title_pl = ?, short_description_pl = ?, full_description_pl = ?,
            title_it = ?, short_description_it = ?, full_description_it = ?,
            title_fr = ?, short_description_fr = ?, full_description_fr = ?,
            title_cs = ?, short_description_cs = ?, full_description_cs = ?,
            title_uk = ?, short_description_uk = ?, full_description_uk = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE offering_id = ?
        `).bind(
          translations.title_ar, translations.short_description_ar, translations.full_description_ar,
          translations.title_de, translations.short_description_de, translations.full_description_de,
          translations.title_ru, translations.short_description_ru, translations.full_description_ru,
          translations.title_pl, translations.short_description_pl, translations.full_description_pl,
          translations.title_it, translations.short_description_it, translations.full_description_it,
          translations.title_fr, translations.short_description_fr, translations.full_description_fr,
          translations.title_cs, translations.short_description_cs, translations.full_description_cs,
          translations.title_uk, translations.short_description_uk, translations.full_description_uk,
          offering.offering_id
        ).run()
        
        translatedCount++
        console.log('Translated offering ' + offering.offering_id)
      } catch (error) {
        failedCount++
        console.error('Failed to translate offering ' + offering.offering_id + ':', error)
      }
    }
    
    return c.json({ 
      success: true,
      total: offerings.results.length,
      translated: translatedCount,
      failed: failedCount,
      message: 'Translated ' + translatedCount + ' offerings to 8 languages'
    })
  } catch (error) {
    console.error('Batch translation error:', error)
    return c.json({ error: 'Batch translation failed: ' + error }, 500)
  }
})

// Translate property tagline (Admin)
app.post('/api/admin/property/:property_id/translate-tagline', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const { openai_api_key } = await c.req.json()
  
  if (!openai_api_key) {
    return c.json({ error: 'OpenAI API key required' }, 400)
  }
  
  try {
    const property: any = await DB.prepare(`
      SELECT tagline FROM properties WHERE property_id = ?
    `).bind(property_id).first()
    
    if (!property || !property.tagline) {
      return c.json({ error: 'Property or tagline not found' }, 404)
    }
    
    const languages = ['de', 'ru', 'pl', 'it', 'fr', 'cs', 'uk']
    const translations: any = {}
    
    for (const lang of languages) {
      const translated = await translateWithAI([property.tagline], lang, openai_api_key)
      translations[`tagline_${lang}`] = translated[0] || property.tagline
    }
    
    await DB.prepare(`
      UPDATE properties SET
        tagline_de = ?, tagline_ru = ?, tagline_pl = ?,
        tagline_it = ?, tagline_fr = ?, tagline_cs = ?, tagline_uk = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ?
    `).bind(
      translations.tagline_de, translations.tagline_ru, translations.tagline_pl,
      translations.tagline_it, translations.tagline_fr, translations.tagline_cs, translations.tagline_uk,
      property_id
    ).run()
    
    return c.json({ success: true, translations })
  } catch (error) {
    console.error('Tagline translation error:', error)
    return c.json({ error: 'Translation failed' }, 500)
  }
})

// Real-time translation API for guest-facing pages (no auth required)
app.post('/api/translate', async (c) => {
  try {
    const { text, target_lang, context, persona } = await c.req.json()
    
    if (!text || !target_lang) {
      return c.json({ error: 'Missing text or target_lang' }, 400)
    }
    
    // For English, return as-is
    if (target_lang === 'en') {
      return c.json({ translated_text: text })
    }
    
    // Get OpenAI API key from environment variable if configured
    // For now, return original text (hotel admin should use batch translation)
    // This is a fallback - ideally translations should be pre-stored in DB
    const apiKey = c.env.OPENAI_API_KEY
    
    if (!apiKey) {
      // No API key, return original text
      return c.json({ translated_text: text })
    }
    
    const languageNames: Record<string, string> = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Modern Standard Arabic',
      'zh': 'Simplified Chinese'
    }
    
    const contextPrompts: Record<string, string> = {
      'hotel_offering_description': 'You are translating hotel offering descriptions (restaurants, spa, events, services). Maintain luxury hospitality tone.',
      'luxury_hospitality': 'You are translating luxury hotel content. Use elegant, professional language appropriate for high-end hospitality.'
    }
    
    const systemPrompt = `You are a professional hospitality translator.
${contextPrompts[context] || contextPrompts['luxury_hospitality']}

CRITICAL REQUIREMENTS:
- Translate with 100% accuracy to ${languageNames[target_lang] || target_lang}
- Maintain tourism marketing tone and appeal
- Preserve formatting, punctuation, and special characters  
- Keep proper nouns (hotel names, locations) unchanged
- Use appropriate formality level for luxury hospitality
- Ensure cultural appropriateness for ${languageNames[target_lang] || target_lang} speakers
- Output ONLY the translation, NO explanations or notes`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    })
    
    if (!response.ok) {
      console.error('Translation API error:', await response.text())
      return c.json({ translated_text: text }) // Fallback
    }
    
    const data: any = await response.json()
    const translatedText = data.choices?.[0]?.message?.content?.trim()
    
    return c.json({ translated_text: translatedText || text })
  } catch (error) {
    console.error('Translation error:', error)
    return c.json({ translated_text: text }, 200) // Fallback to original
  }
})

// Remove vendor from hotel (Admin)
app.delete('/api/admin/vendors/:vendor_id/remove', async (c) => {
  const { DB } = c.env
  const { vendor_id } = c.req.param()
  const property_id = c.req.query('property_id')
  
  try {
    // Remove vendor-property link
    await DB.prepare(`
      DELETE FROM vendor_properties 
      WHERE vendor_id = ? AND property_id = ?
    `).bind(vendor_id, property_id).run()
    
    return c.json({ success: true, message: 'Vendor removed from hotel' })
  } catch (error) {
    console.error('Remove vendor error:', error)
    return c.json({ error: 'Failed to remove vendor' }, 500)
  }
})

// Get all activities (Admin)
app.get('/api/admin/activities', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const activities = await DB.prepare(`
      SELECT 
        a.*,
        v.business_name,
        c.name_en as category_name
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      WHERE vp.property_id = ?
      ORDER BY a.created_at DESC
    `).bind(property_id).all()
    
    return c.json(activities.results)
  } catch (error) {
    console.error('Get activities error:', error)
    return c.json({ error: 'Failed to get activities' }, 500)
  }
})

// Delete activity (Admin)
app.delete('/api/admin/activities/:activity_id', async (c) => {
  const { DB } = c.env
  const { activity_id } = c.req.param()
  
  try {
    await DB.prepare(`
      UPDATE activities SET status = 'inactive' WHERE activity_id = ?
    `).bind(activity_id).run()
    
    return c.json({ success: true, message: 'Activity deactivated' })
  } catch (error) {
    console.error('Delete activity error:', error)
    return c.json({ error: 'Failed to delete activity' }, 500)
  }
})

// ============================================
// RESTAURANT TABLE BOOKING APIs
// ============================================

// Get all tables for a restaurant
app.get('/api/restaurant/:offering_id/tables', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  
  try {
    const tables = await DB.prepare(`
      SELECT * FROM restaurant_tables 
      WHERE offering_id = ? AND is_active = 1
      ORDER BY table_number
    `).bind(offering_id).all()
    
    return c.json({ 
      success: true,
      tables: tables.results.map(t => ({
        ...t,
        features: t.features ? JSON.parse(t.features) : []
      }))
    })
  } catch (error) {
    console.error('Get tables error:', error)
    return c.json({ error: 'Failed to get tables' }, 500)
  }
})

// Create table (Admin)
app.post('/api/admin/restaurant/table', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO restaurant_tables (
        offering_id, table_number, table_name, capacity,
        position_x, position_y, width, height, shape, table_type, features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.offering_id,
      data.table_number,
      data.table_name || null,
      data.capacity,
      data.position_x || 0,
      data.position_y || 0,
      data.width || 100,
      data.height || 80,
      data.shape || 'rectangle',
      data.table_type || 'standard',
      JSON.stringify(data.features || [])
    ).run()
    
    return c.json({ 
      success: true,
      table_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Create table error:', error)
    return c.json({ error: 'Failed to create table' }, 500)
  }
})

// Update table (Admin)
app.put('/api/admin/restaurant/table/:table_id', async (c) => {
  const { DB } = c.env
  const { table_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE restaurant_tables SET
        table_number = ?, table_name = ?, capacity = ?,
        position_x = ?, position_y = ?, width = ?, height = ?,
        shape = ?, table_type = ?, features = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE table_id = ?
    `).bind(
      data.table_number,
      data.table_name || null,
      data.capacity,
      data.position_x,
      data.position_y,
      data.width,
      data.height,
      data.shape,
      data.table_type,
      JSON.stringify(data.features || []),
      table_id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update table error:', error)
    return c.json({ error: 'Failed to update table' }, 500)
  }
})

// Delete table (Admin)
app.delete('/api/admin/restaurant/table/:table_id', async (c) => {
  const { DB } = c.env
  const { table_id } = c.req.param()
  
  try {
    await DB.prepare(`
      UPDATE restaurant_tables SET is_active = 0 WHERE table_id = ?
    `).bind(table_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete table error:', error)
    return c.json({ error: 'Failed to delete table' }, 500)
  }
})

// Get dining sessions for a restaurant
app.get('/api/restaurant/:offering_id/sessions', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  
  try {
    const sessions = await DB.prepare(`
      SELECT * FROM dining_sessions 
      WHERE offering_id = ? AND session_date = ?
      ORDER BY session_time
    `).bind(offering_id, date).all()
    
    return c.json({ 
      success: true,
      sessions: sessions.results
    })
  } catch (error) {
    console.error('Get sessions error:', error)
    return c.json({ error: 'Failed to get sessions' }, 500)
  }
})

// Create dining session (Admin)
app.post('/api/admin/restaurant/session', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO dining_sessions (
        offering_id, session_date, session_time, session_type,
        duration_minutes, max_capacity, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.offering_id,
      data.session_date,
      data.session_time,
      data.session_type,
      data.duration_minutes || 90,
      data.max_capacity,
      'available'
    ).run()
    
    return c.json({ 
      success: true,
      session_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Create session error:', error)
    return c.json({ error: 'Failed to create session' }, 500)
  }
})

// Get table availability for a session
app.get('/api/restaurant/session/:session_id/availability', async (c) => {
  const { DB } = c.env
  const { session_id } = c.req.param()
  
  try {
    // Get session details
    const session = await DB.prepare(`
      SELECT * FROM dining_sessions WHERE session_id = ?
    `).bind(session_id).first()
    
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }
    
    // Get all tables for this restaurant
    const tables = await DB.prepare(`
      SELECT * FROM restaurant_tables 
      WHERE offering_id = ? AND is_active = 1
    `).bind(session.offering_id).all()
    
    // Get reserved tables for this session
    const reservations = await DB.prepare(`
      SELECT table_id FROM table_reservations 
      WHERE session_id = ? AND status != 'cancelled'
    `).bind(session_id).all()
    
    const reservedTableIds = new Set(reservations.results.map(r => r.table_id))
    
    const availableTables = tables.results.map(t => ({
      ...t,
      features: t.features ? JSON.parse(t.features) : [],
      is_available: !reservedTableIds.has(t.table_id)
    }))
    
    return c.json({ 
      success: true,
      session: session,
      tables: availableTables
    })
  } catch (error) {
    console.error('Get availability error:', error)
    return c.json({ error: 'Failed to get availability' }, 500)
  }
})

// Create table reservation
app.post('/api/restaurant/reserve', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Validate table capacity
    const table = await DB.prepare(`
      SELECT capacity FROM restaurant_tables WHERE table_id = ?
    `).bind(data.table_id).first()
    
    if (!table) {
      return c.json({ error: 'Table not found' }, 404)
    }
    
    if (data.num_guests > table.capacity) {
      return c.json({ error: `Table capacity is ${table.capacity} guests` }, 400)
    }
    
    // Check if table is already booked
    const existing = await DB.prepare(`
      SELECT reservation_id FROM table_reservations 
      WHERE session_id = ? AND table_id = ? AND status != 'cancelled'
    `).bind(data.session_id, data.table_id).first()
    
    if (existing) {
      return c.json({ error: 'Table is already reserved' }, 400)
    }
    
    // Create reservation
    const result = await DB.prepare(`
      INSERT INTO table_reservations (
        session_id, table_id, guest_id, property_id,
        reservation_date, reservation_time, num_guests,
        special_requests, dietary_requirements, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).bind(
      data.session_id,
      data.table_id,
      data.guest_id,
      data.property_id,
      data.reservation_date,
      data.reservation_time,
      data.num_guests,
      data.special_requests || null,
      data.dietary_requirements || null
    ).run()
    
    // Update session booking count
    await DB.prepare(`
      UPDATE dining_sessions 
      SET current_bookings = current_bookings + ?
      WHERE session_id = ?
    `).bind(data.num_guests, data.session_id).run()
    
    return c.json({ 
      success: true,
      reservation_id: result.meta.last_row_id,
      message: 'Table reserved successfully!'
    })
  } catch (error) {
    console.error('Create reservation error:', error)
    return c.json({ error: 'Failed to create reservation' }, 500)
  }
})

// Create offering booking (General bookings for restaurants, events, spa)
app.post('/api/offering-booking', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Create guest record if doesn't exist
    let guest = await DB.prepare(`
      SELECT guest_id FROM guests WHERE email = ?
    `).bind(data.guest_email).first()
    
    let guestId = guest?.guest_id
    
    if (!guestId) {
      const newGuest = await DB.prepare(`
        INSERT INTO guests (email, name, phone, language_preference)
        VALUES (?, ?, ?, 'en')
      `).bind(data.guest_email, data.guest_name, data.guest_phone).run()
      guestId = newGuest.meta.last_row_id
    }
    
    // Create offering booking record
    const result = await DB.prepare(`
      INSERT INTO offering_bookings (
        offering_id, guest_id, property_id, booking_date,
        num_guests, total_amount, special_requests, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      data.offering_id,
      guestId,
      data.property_id,
      data.booking_date,
      data.num_guests,
      data.total_amount,
      data.special_requests || null
    ).run()
    
    return c.json({
      success: true,
      booking_id: result.meta.last_row_id,
      message: 'Booking request submitted! We will contact you shortly.'
    })
  } catch (error) {
    console.error('Create offering booking error:', error)
    return c.json({ error: 'Failed to create booking' }, 500)
  }
})

// Get reservations (Admin)
app.get('/api/admin/restaurant/reservations', async (c) => {
  const { DB } = c.env
  const offering_id = c.req.query('offering_id')
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  
  try {
    const reservations = await DB.prepare(`
      SELECT 
        tr.*,
        rt.table_number,
        rt.table_name,
        ds.session_time,
        ds.session_type,
        g.first_name,
        g.last_name,
        g.email,
        g.phone
      FROM table_reservations tr
      JOIN restaurant_tables rt ON tr.table_id = rt.table_id
      JOIN dining_sessions ds ON tr.session_id = ds.session_id
      JOIN guests g ON tr.guest_id = g.guest_id
      WHERE rt.offering_id = ? AND tr.reservation_date = ?
      ORDER BY ds.session_time, rt.table_number
    `).bind(offering_id, date).all()
    
    return c.json({ 
      success: true,
      reservations: reservations.results
    })
  } catch (error) {
    console.error('Get reservations error:', error)
    return c.json({ error: 'Failed to get reservations' }, 500)
  }
})

// ============================================
// HOTEL LANDING PAGE & APIs
// ============================================

// API: Get property details
app.get('/api/properties', async (c) => {
  const { DB } = c.env
  const slug = c.req.query('slug')
  const property_id = c.req.query('property_id')
  
  try {
    let properties;
    
    if (slug) {
      properties = await DB.prepare(`
        SELECT * FROM properties WHERE slug = ? AND status = 'active'
      `).bind(slug).all()
    } else if (property_id) {
      properties = await DB.prepare(`
        SELECT * FROM properties WHERE property_id = ? AND status = 'active'
      `).bind(property_id).all()
    } else {
      properties = await DB.prepare(`
        SELECT * FROM properties WHERE status = 'active' ORDER BY name
      `).all()
    }
    
    return c.json({ 
      success: true,
      properties: properties.results
    })
  } catch (error) {
    console.error('Get properties error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// SEASONAL EFFECTS API
// ============================================

// Get seasonal settings for a property
app.get('/api/seasonal-settings/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  
  try {
    const settings = await DB.prepare(`
      SELECT * FROM seasonal_settings WHERE property_id = ?
    `).bind(property_id).first()
    
    if (!settings) {
      // Create default settings if none exist
      await DB.prepare(`
        INSERT INTO seasonal_settings (property_id, active_theme) VALUES (?, 'none')
      `).bind(property_id).run()
      
      const newSettings = await DB.prepare(`
        SELECT * FROM seasonal_settings WHERE property_id = ?
      `).bind(property_id).first()
      
      return c.json({ success: true, settings: newSettings })
    }
    
    return c.json({ success: true, settings })
  } catch (error) {
    console.error('Get seasonal settings error:', error)
    return c.json({ error: 'Failed to get settings' }, 500)
  }
})

// Update seasonal settings (Admin)
app.put('/api/admin/seasonal-settings/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const data = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE seasonal_settings SET
        active_theme = ?,
        is_active = ?,
        enable_snow = ?,
        enable_fireworks = ?,
        enable_confetti = ?,
        enable_lights = ?,
        enable_overlay = ?,
        overlay_type = ?,
        overlay_position = ?,
        custom_decorations = ?,
        theme_primary_color = ?,
        theme_secondary_color = ?,
        custom_message = ?,
        auto_activate_start = ?,
        auto_activate_end = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ?
    `).bind(
      data.active_theme || 'none',
      data.is_active ? 1 : 0,
      data.enable_snow ? 1 : 0,
      data.enable_fireworks ? 1 : 0,
      data.enable_confetti ? 1 : 0,
      data.enable_lights ? 1 : 0,
      data.enable_overlay ? 1 : 0,
      data.overlay_type || null,
      data.overlay_position || 'top-right',
      data.custom_decorations || null,
      data.theme_primary_color || null,
      data.theme_secondary_color || null,
      data.custom_message || null,
      data.auto_activate_start || null,
      data.auto_activate_end || null,
      property_id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update seasonal settings error:', error)
    return c.json({ error: 'Failed to update settings' }, 500)
  }
})

// API: Get hotel offerings by property
app.get('/api/hotel-offerings/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const lang = c.req.query('lang') || 'en'
  const offering_type = c.req.query('type') // optional filter
  
  try {
    let query = `
      SELECT 
        ho.*,
        CASE 
          WHEN ? = 'ar' THEN COALESCE(ho.title_ar, ho.title_en)
          WHEN ? = 'de' THEN COALESCE(ho.title_de, ho.title_en)
          WHEN ? = 'ru' THEN COALESCE(ho.title_ru, ho.title_en)
          WHEN ? = 'pl' THEN COALESCE(ho.title_pl, ho.title_en)
          WHEN ? = 'it' THEN COALESCE(ho.title_it, ho.title_en)
          WHEN ? = 'fr' THEN COALESCE(ho.title_fr, ho.title_en)
          WHEN ? = 'cs' THEN COALESCE(ho.title_cs, ho.title_en)
          WHEN ? = 'uk' THEN COALESCE(ho.title_uk, ho.title_en)
          ELSE ho.title_en
        END as title,
        CASE 
          WHEN ? = 'ar' THEN COALESCE(ho.short_description_ar, ho.short_description_en)
          WHEN ? = 'de' THEN COALESCE(ho.short_description_de, ho.short_description_en)
          WHEN ? = 'ru' THEN COALESCE(ho.short_description_ru, ho.short_description_en)
          WHEN ? = 'pl' THEN COALESCE(ho.short_description_pl, ho.short_description_en)
          WHEN ? = 'it' THEN COALESCE(ho.short_description_it, ho.short_description_en)
          WHEN ? = 'fr' THEN COALESCE(ho.short_description_fr, ho.short_description_en)
          WHEN ? = 'cs' THEN COALESCE(ho.short_description_cs, ho.short_description_en)
          WHEN ? = 'uk' THEN COALESCE(ho.short_description_uk, ho.short_description_en)
          ELSE ho.short_description_en
        END as short_description,
        CASE 
          WHEN ? = 'ar' THEN COALESCE(ho.full_description_ar, ho.full_description_en)
          WHEN ? = 'de' THEN COALESCE(ho.full_description_de, ho.full_description_en)
          WHEN ? = 'ru' THEN COALESCE(ho.full_description_ru, ho.full_description_en)
          WHEN ? = 'pl' THEN COALESCE(ho.full_description_pl, ho.full_description_en)
          WHEN ? = 'it' THEN COALESCE(ho.full_description_it, ho.full_description_en)
          WHEN ? = 'fr' THEN COALESCE(ho.full_description_fr, ho.full_description_en)
          WHEN ? = 'cs' THEN COALESCE(ho.full_description_cs, ho.full_description_en)
          WHEN ? = 'uk' THEN COALESCE(ho.full_description_uk, ho.full_description_en)
          ELSE ho.full_description_en
        END as full_description
      FROM hotel_offerings ho
      WHERE ho.property_id = ?
        AND ho.status = 'active'
        ${offering_type ? 'AND ho.offering_type = ?' : ''}
      ORDER BY ho.is_featured DESC, ho.display_order ASC, ho.created_at DESC
    `
    
    // Build params array: 8 params for title + 8 for short_desc + 8 for full_desc + property_id + optional type
    const langParams = Array(24).fill(lang) // 8 CASE statements × 3 fields
    const params = offering_type 
      ? [...langParams, property_id, offering_type]
      : [...langParams, property_id]
    
    const offerings = await DB.prepare(query).bind(...params).all()
    
    return c.json({ 
      success: true,
      offerings: offerings.results.map(o => ({
        ...o,
        images: o.images ? JSON.parse(o.images) : [],
        includes: o.includes ? JSON.parse(o.includes) : []
      }))
    })
  } catch (error) {
    console.error('Get hotel offerings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// API: Get restaurant menus for an offering
app.get('/api/offerings/:offering_id/menus', async (c) => {
  const { DB } = c.env
  const { offering_id } = c.req.param()
  
  try {
    const menus = await DB.prepare(`
      SELECT menu_id, menu_name, menu_url, menu_type, display_order
      FROM restaurant_menus
      WHERE offering_id = ? AND is_active = 1
      ORDER BY display_order ASC, created_at ASC
    `).bind(offering_id).all()
    
    return c.json({ success: true, menus: menus.results })
  } catch (error) {
    console.error('Get menus error:', error)
    return c.json({ error: 'Failed to get menus' }, 500)
  }
})

// API: Get linked vendor activities for a property
app.get('/api/property-vendor-activities/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  const lang = c.req.query('lang') || 'en'
  
  try {
    const activities = await DB.prepare(`
      SELECT 
        a.*,
        v.business_name,
        v.slug as vendor_slug,
        c.name_en as category_name,
        CASE WHEN ? = 'ar' THEN a.title_ar ELSE a.title_en END as title,
        CASE WHEN ? = 'ar' THEN a.short_description_ar ELSE a.short_description_en END as short_description,
        a.title_en, a.title_ar,
        a.short_description_en, a.short_description_ar
      FROM activities a
      JOIN vendors v ON a.vendor_id = v.vendor_id
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      JOIN categories c ON a.category_id = c.category_id
      WHERE vp.property_id = ?
        AND vp.status = 'active'
        AND a.status = 'active'
        AND v.status = 'active'
      ORDER BY a.is_featured DESC, a.popularity_score DESC
      LIMIT 50
    `).bind(lang, lang, property_id).all()
    
    // For non-EN/AR languages, translate using AI if API key is available
    let translatedActivities = activities.results;
    
    if (lang !== 'en' && lang !== 'ar') {
      // Try to get API key from environment
      const openai_api_key = process.env.OPENAI_API_KEY;
      
      if (openai_api_key) {
        try {
          translatedActivities = await Promise.all(activities.results.map(async (activity) => {
            const translated = await translateActivityContent(
              activity.title_en,
              activity.short_description_en,
              lang,
              openai_api_key
            );
            
            return {
              ...activity,
              title: translated.title || activity.title,
              short_description: translated.short_description || activity.short_description
            };
          }));
        } catch (translationError) {
          console.warn('Translation failed, using English:', translationError);
          // Fall back to English if translation fails
        }
      }
    }
    
    return c.json({ 
      success: true,
      activities: translatedActivities.map(a => ({
        ...a,
        images: a.images ? JSON.parse(a.images) : []
      }))
    })
  } catch (error) {
    console.error('Get property vendor activities error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// AI PROOFREADING API ENDPOINT
// ============================================

// API: AI Proofread Text with Rate Limiting
app.post('/api/ai/proofread', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { text, user_id, user_type } = body
    
    // Validation
    if (!text || !user_id || !user_type) {
      return c.json({ error: 'Missing required fields: text, user_id, user_type' }, 400)
    }
    
    if (!['admin', 'vendor'].includes(user_type)) {
      return c.json({ error: 'Invalid user_type. Must be admin or vendor' }, 400)
    }
    
    if (text.length > 5000) {
      return c.json({ error: 'Text too long. Maximum 5000 characters allowed.' }, 400)
    }
    
    // Check rate limiting
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's usage
    const usage = await DB.prepare(`
      SELECT request_count, last_request_time
      FROM ai_proofreading_usage
      WHERE user_id = ? AND user_type = ? AND usage_date = ?
    `).bind(user_id, user_type, today).first()
    
    // Check daily limit (10 requests per day)
    if (usage && usage.request_count >= 10) {
      return c.json({ 
        error: 'Daily limit reached', 
        message: 'You have reached your daily limit of 10 AI proofreading requests. Please try again tomorrow.',
        limit: 10,
        used: usage.request_count
      }, 429)
    }
    
    // Check cooldown period (60 seconds between requests)
    if (usage && usage.last_request_time) {
      const lastRequest = new Date(usage.last_request_time).getTime()
      const now = new Date().getTime()
      const timeDiff = (now - lastRequest) / 1000 // seconds
      
      if (timeDiff < 60) {
        const waitTime = Math.ceil(60 - timeDiff)
        return c.json({ 
          error: 'Cooldown period active', 
          message: `Please wait ${waitTime} seconds before making another proofreading request.`,
          wait_seconds: waitTime
        }, 429)
      }
    }
    
    // Call AI proofreading (using GenSpark LLM proxy)
    const startTime = Date.now()
    let proofreadText = text
    let modelUsed = 'gpt-5-nano'
    
    try {
      // Check if GenSpark API is configured
      const apiKey = process.env.OPENAI_API_KEY
      const baseURL = process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
      
      if (!apiKey) {
        // Fallback: Return formatted text with basic improvements
        console.warn('GenSpark API not configured. Using fallback formatting.')
        proofreadText = text.trim()
        modelUsed = 'fallback'
      } else {
        // Use GenSpark LLM API for proofreading
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-5-nano', // Fastest, cheapest model
            messages: [{
              role: 'system',
              content: `You are a professional proofreading assistant for hotel and tourism content. Your task is to:

1. Fix grammar, spelling, and punctuation errors
2. Improve sentence structure and clarity
3. Maintain the original meaning and tone
4. Use professional hospitality language
5. Keep the text length similar to the original
6. Output ONLY the corrected text, NO explanations or comments

Important: Do not add or remove information. Only improve grammar, spelling, and readability.`
            }, {
              role: 'user',
              content: `Please proofread and improve this text:\n\n${text}`
            }],
            temperature: 0.3,
            max_tokens: 1000
          })
        })
        
        if (response.ok) {
          const data: any = await response.json()
          proofreadText = data.choices?.[0]?.message?.content?.trim() || text
        } else {
          console.error('AI API error:', await response.text())
          proofreadText = text.trim()
          modelUsed = 'fallback'
        }
      }
    } catch (aiError) {
      console.error('AI proofreading error:', aiError)
      proofreadText = text.trim()
      modelUsed = 'fallback'
    }
    
    const processingTime = Date.now() - startTime
    
    // Update usage tracking
    await DB.prepare(`
      INSERT INTO ai_proofreading_usage (user_id, user_type, request_count, last_request_time, usage_date)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(user_id, user_type, usage_date) 
      DO UPDATE SET 
        request_count = request_count + 1,
        last_request_time = CURRENT_TIMESTAMP
    `).bind(user_id, user_type, today).run()
    
    // Log the request for analytics
    await DB.prepare(`
      INSERT INTO ai_proofreading_logs (user_id, user_type, original_text, proofread_text, text_length, model_used, processing_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(user_id, user_type, text, proofreadText, text.length, modelUsed, processingTime).run()
    
    // Get updated usage stats
    const updatedUsage = await DB.prepare(`
      SELECT request_count
      FROM ai_proofreading_usage
      WHERE user_id = ? AND user_type = ? AND usage_date = ?
    `).bind(user_id, user_type, today).first()
    
    return c.json({
      success: true,
      original_text: text,
      proofread_text: proofreadText,
      model_used: modelUsed,
      processing_time_ms: processingTime,
      usage: {
        used: updatedUsage?.request_count || 0,
        limit: 10,
        remaining: 10 - (updatedUsage?.request_count || 0)
      }
    })
    
  } catch (error) {
    console.error('AI proofread error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================
// RAG CHATBOT UTILITY FUNCTIONS
// ============================================

// Split text into chunks for RAG
function chunkText(text: string, maxChunkSize: number = 500): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence + '. '
    } else {
      currentChunk += sentence + '. '
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

// Simple keyword-based search for chunks (BM25-like)
function calculateRelevanceScore(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const textLower = text.toLowerCase()
  
  let score = 0
  for (const word of queryWords) {
    // Exact match
    if (textLower.includes(word)) {
      score += 2
    }
    // Partial match
    const regex = new RegExp(word.substring(0, Math.min(word.length, 4)), 'i')
    if (regex.test(textLower)) {
      score += 1
    }
  }
  
  return score
}

// ============================================
// RAG CHATBOT API ENDPOINTS
// ============================================

// API: Upload/Create Knowledge Base Document
app.post('/api/admin/chatbot/documents', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { property_id, title, content, document_type } = body
    
    if (!property_id || !title || !content) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Insert document
    const docResult = await DB.prepare(`
      INSERT INTO chatbot_documents (property_id, title, content, document_type)
      VALUES (?, ?, ?, ?)
    `).bind(property_id, title, content, document_type || 'general').run()
    
    const documentId = docResult.meta.last_row_id
    
    // Chunk the content
    const chunks = chunkText(content)
    
    // Insert chunks
    for (let i = 0; i < chunks.length; i++) {
      await DB.prepare(`
        INSERT INTO chatbot_chunks (document_id, property_id, chunk_text, chunk_index, embedding_text, token_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(documentId, property_id, chunks[i], i, chunks[i].toLowerCase(), chunks[i].split(/\s+/).length).run()
    }
    
    return c.json({ 
      success: true, 
      document_id: documentId,
      chunks_created: chunks.length 
    })
    
  } catch (error) {
    console.error('Create document error:', error)
    return c.json({ error: 'Failed to create document' }, 500)
  }
})

// API: Get all documents for a property
app.get('/api/admin/chatbot/documents', async (c) => {
  const { DB } = c.env
  const property_id = c.req.query('property_id')
  
  try {
    const documents = await DB.prepare(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM chatbot_chunks WHERE document_id = d.document_id) as chunk_count
      FROM chatbot_documents d
      WHERE d.property_id = ? AND d.is_active = 1
      ORDER BY d.created_at DESC
    `).bind(property_id).all()
    
    return c.json({ success: true, documents: documents.results || [] })
  } catch (error) {
    console.error('Get documents error:', error)
    return c.json({ error: 'Failed to get documents' }, 500)
  }
})

// API: Delete document
app.delete('/api/admin/chatbot/documents/:document_id', async (c) => {
  const { DB } = c.env
  const { document_id } = c.req.param()
  
  try {
    await DB.prepare(`UPDATE chatbot_documents SET is_active = 0 WHERE document_id = ?`).bind(document_id).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return c.json({ error: 'Failed to delete document' }, 500)
  }
})

// API: Chat with RAG
app.post('/api/chatbot/chat', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { property_id, session_id, message, conversation_id } = body
    
    if (!property_id || !session_id || !message) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Rate limiting check
    const today = new Date().toISOString().split('T')[0]
    const rateLimit = await DB.prepare(`
      SELECT message_count FROM chatbot_rate_limits
      WHERE property_id = ? AND session_id = ? AND reset_date = ?
    `).bind(property_id, session_id, today).first()
    
    if (rateLimit && rateLimit.message_count >= 20) {
      return c.json({ 
        error: 'Rate limit exceeded',
        message: 'You have reached your daily limit of 20 messages. Please try again tomorrow.'
      }, 429)
    }
    
    // Get or create conversation
    let convId = conversation_id
    if (!convId) {
      const convResult = await DB.prepare(`
        INSERT INTO chatbot_conversations (property_id, session_id)
        VALUES (?, ?)
      `).bind(property_id, session_id).run()
      convId = convResult.meta.last_row_id
    }
    
    // Store user message
    await DB.prepare(`
      INSERT INTO chatbot_messages (conversation_id, role, content)
      VALUES (?, 'user', ?)
    `).bind(convId, message).run()
    
    // RAG: Find relevant chunks
    const allChunks = await DB.prepare(`
      SELECT chunk_id, chunk_text, document_id
      FROM chatbot_chunks
      WHERE property_id = ?
    `).bind(property_id).all()
    
    // Score and rank chunks
    const scoredChunks = (allChunks.results || []).map((chunk: any) => ({
      ...chunk,
      score: calculateRelevanceScore(message, chunk.chunk_text)
    })).filter((chunk: any) => chunk.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3) // Top 3 most relevant chunks
    
    // Build context from chunks
    const context = scoredChunks.map((chunk: any) => chunk.chunk_text).join('\n\n')
    const chunkIds = scoredChunks.map((chunk: any) => chunk.chunk_id)
    
    // Generate AI response
    const apiKey = process.env.OPENAI_API_KEY
    const baseURL = process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
    
    let aiResponse = 'I apologize, but I am unable to answer your question at the moment. Please contact the hotel staff for assistance.'
    
    if (apiKey && context.length > 0) {
      try {
        const systemPrompt = `You are a helpful hotel assistant. Use the following information to answer the guest's question. If the information doesn't contain the answer, say you don't know and suggest contacting the hotel staff.

Hotel Information:
${context}

Answer in a friendly, professional manner. Keep responses concise but informative.`
        
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-5-nano',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 300
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          aiResponse = data.choices[0].message.content
        }
      } catch (error) {
        console.error('AI chat error:', error)
      }
    } else if (!apiKey) {
      aiResponse = 'AI service is not configured. Please contact the administrator.'
    } else {
      aiResponse = 'I don\'t have specific information about that. Please contact the hotel staff for assistance.'
    }
    
    // Store AI response
    await DB.prepare(`
      INSERT INTO chatbot_messages (conversation_id, role, content, chunks_used)
      VALUES (?, 'assistant', ?, ?)
    `).bind(convId, aiResponse, JSON.stringify(chunkIds)).run()
    
    // Update rate limit
    if (rateLimit) {
      await DB.prepare(`
        UPDATE chatbot_rate_limits 
        SET message_count = message_count + 1
        WHERE property_id = ? AND session_id = ? AND reset_date = ?
      `).bind(property_id, session_id, today).run()
    } else {
      await DB.prepare(`
        INSERT INTO chatbot_rate_limits (property_id, session_id, message_count, reset_date)
        VALUES (?, ?, 1, ?)
      `).bind(property_id, session_id, today).run()
    }
    
    // Track chunk usage (simplified - just insert)
    for (const chunkId of chunkIds) {
      try {
        await DB.prepare(`
          INSERT INTO chatbot_chunk_usage (chunk_id, property_id, times_retrieved, last_used)
          VALUES (?, ?, 1, CURRENT_TIMESTAMP)
        `).bind(chunkId, property_id).run()
      } catch {
        // Ignore duplicate errors for now
      }
    }
    
    return c.json({ 
      success: true,
      response: aiResponse,
      conversation_id: convId,
      chunks_used: chunkIds.length
    })
    
  } catch (error) {
    console.error('Chatbot error:', error)
    return c.json({ error: 'Failed to process message' }, 500)
  }
})

// API: Get chatbot settings
app.get('/api/chatbot/settings/:property_id', async (c) => {
  const { DB } = c.env
  const { property_id } = c.req.param()
  
  try {
    const settings = await DB.prepare(`
      SELECT chatbot_enabled, chatbot_greeting_en, chatbot_name, chatbot_avatar_url
      FROM properties
      WHERE property_id = ?
    `).bind(property_id).first()
    
    return c.json({ success: true, settings })
  } catch (error) {
    console.error('Get chatbot settings error:', error)
    return c.json({ error: 'Failed to get settings' }, 500)
  }
})

// API: Update chatbot settings
app.post('/api/admin/chatbot/settings', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { property_id, chatbot_enabled, chatbot_greeting_en, chatbot_name, chatbot_avatar_url } = body
    
    await DB.prepare(`
      UPDATE properties
      SET chatbot_enabled = ?, chatbot_greeting_en = ?, chatbot_name = ?, chatbot_avatar_url = ?
      WHERE property_id = ?
    `).bind(chatbot_enabled ? 1 : 0, chatbot_greeting_en, chatbot_name, chatbot_avatar_url, property_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Update chatbot settings error:', error)
    return c.json({ error: 'Failed to update settings' }, 500)
  }
})

// Hotel Landing Page - Main QR entry point
app.get('/hotel/:property_slug', async (c) => {
  const { property_slug } = c.req.param()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="mobile-web-app-capable" content="yes">
        <title>Welcome</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style id="dynamic-styles">
          /* Dynamic styles will be injected here */
        </style>
        <style>
          body { 
            -webkit-font-smoothing: antialiased;
          }
          .offering-card {
            transition: all 0.3s ease;
          }
          .offering-card:active {
            transform: scale(0.98);
          }
          .category-pill {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            transition: all 0.2s;
          }
          .category-pill:active {
            transform: scale(0.95);
          }
          .sticky-nav {
            position: sticky;
            top: 0;
            z-index: 40;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          /* Social Media Profile Style */
          .gradient-hero {
            position: relative;
            background-size: cover;
            background-position: center;
          }
          
          #propertyLogo img {
            transition: transform 0.3s ease;
          }
          
          #propertyLogo img:hover {
            transform: scale(1.05);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Loading Spinner -->
        <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
                <p class="mt-4 text-gray-600">Loading your experience...</p>
            </div>
        </div>

        <div id="content" class="hidden">
            <!-- Hero Header - Facebook Profile Style -->
            <div class="relative bg-white">
                <!-- Cover Photo -->
                <div class="gradient-hero h-64 md:h-96 relative">
                    <!-- Info Button & Language Selector - Top Right on Cover -->
                    <div class="absolute top-4 right-4 z-10 flex gap-2">
                        <button id="infoButton" onclick="openInfoMenu()" class="px-4 py-2 text-white rounded-lg shadow-lg font-semibold transition flex items-center gap-2" title="Hotel Information">
                            <i class="fas fa-info-circle"></i>
                            <span class="hidden sm:inline">Info</span>
                        </button>
                        <select id="languageSelector" class="px-3 py-2 bg-white/90 backdrop-blur-sm text-gray-800 rounded-lg shadow-lg text-sm cursor-pointer hover:bg-white transition" onchange="changeLanguage()">
                            <option value="en">🇬🇧 English</option>
                            <option value="ar">🇸🇦 العربية</option>
                            <option value="de">🇩🇪 Deutsch</option>
                            <option value="ru">🇷🇺 Русский</option>
                            <option value="pl">🇵🇱 Polski</option>
                            <option value="it">🇮🇹 Italiano</option>
                            <option value="fr">🇫🇷 Français</option>
                            <option value="cs">🇨🇿 Čeština</option>
                            <option value="uk">🇺🇦 Українська</option>
                        </select>
                    </div>
                    <!-- Profile Picture - Overlaps at bottom left of cover -->
                    <div class="absolute bottom-0 left-4 md:left-8 translate-y-1/2">
                        <div id="propertyLogo" class="relative">
                            <!-- Logo placeholder - will be replaced if logo exists -->
                            <div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white shadow-lg border-4 border-white flex items-center justify-center">
                                <i class="fas fa-hotel text-2xl md:text-3xl text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Profile Info Section -->
                <div class="pt-14 md:pt-20 pb-6 px-4 md:px-8">
                    <div class="max-w-6xl mx-auto">
                        <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900" id="propertyName">Paradise Resort</h1>
                        <p class="text-sm md:text-base text-gray-600 mb-4" id="propertyTagline">Discover all we have to offer</p>
                    </div>
                </div>
            </div>

            <!-- Category Filter Pills -->
            <div class="sticky-nav py-4 px-4 overflow-x-auto">
                <div class="max-w-6xl mx-auto flex gap-2 whitespace-nowrap" id="category-pills-container">
                    <button onclick="filterOfferings('all')" class="category-pill bg-blue-500 text-white" data-category="all">
                        <i class="fas fa-th-large mr-2"></i><span data-i18n="pill-all">All</span>
                    </button>
                    <button onclick="filterOfferings('restaurant')" class="category-pill bg-gray-200 text-gray-700" data-category="restaurant">
                        <i class="fas fa-utensils mr-2"></i><span id="pill-restaurants" data-i18n="pill-restaurants">Restaurants</span>
                    </button>
                    <button onclick="filterOfferings('event')" class="category-pill bg-gray-200 text-gray-700" data-category="event">
                        <i class="fas fa-calendar-star mr-2"></i><span id="pill-events" data-i18n="pill-events">Events</span>
                    </button>
                    <button onclick="filterOfferings('spa')" class="category-pill bg-gray-200 text-gray-700" data-category="spa">
                        <i class="fas fa-spa mr-2"></i><span id="pill-spa" data-i18n="pill-spa">Spa</span>
                    </button>
                    <button onclick="filterOfferings('service')" class="category-pill bg-gray-200 text-gray-700" data-category="service">
                        <i class="fas fa-concierge-bell mr-2"></i><span id="pill-services" data-i18n="pill-services">Services</span>
                    </button>
                    <button onclick="filterOfferings('activities')" class="category-pill bg-gray-200 text-gray-700" data-category="activities">
                        <i class="fas fa-hiking mr-2"></i><span id="pill-activities" data-i18n="pill-activities">Activities</span>
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="max-w-6xl mx-auto px-4 py-6 pb-20">
                
                <!-- Hotel Restaurants Section -->
                <section id="restaurants-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-utensils text-blue-500 mr-3"></i>
                        <span id="section-heading-restaurants">Our Restaurants</span>
                    </h2>
                    <div id="restaurants-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Upcoming Events Section -->
                <section id="events-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-calendar-star text-purple-500 mr-3"></i>
                        <span id="section-heading-events">Upcoming Events</span>
                    </h2>
                    <div id="events-grid" class="grid grid-cols-1 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Spa & Wellness Section -->
                <section id="spa-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-spa text-green-500 mr-3"></i>
                        <span id="section-heading-spa">Spa & Wellness</span>
                    </h2>
                    <div id="spa-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Hotel Services Section -->
                <section id="service-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-concierge-bell text-indigo-500 mr-3"></i>
                        <span id="section-heading-service">Hotel Services</span>
                    </h2>
                    <div id="service-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>

                <!-- Vendor Activities Section -->
                <section id="activities-section" class="mb-12">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-hiking text-orange-500 mr-3"></i>
                        <span id="section-heading-activities">Activities & Experiences</span>
                    </h2>
                    <p class="text-gray-600 mb-4 text-sm" data-i18n="curated-experiences">Curated experiences from our trusted partners</p>
                    <div id="activities-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Loaded dynamically -->
                    </div>
                </section>
                
            </div>
        </div>

        <!-- Floating Map Button (appears when map available) -->
        <button id="mapFloatingBtn" 
                onclick="openMapModal()" 
                class="fixed bottom-6 right-6 text-white px-6 py-3 rounded-full shadow-2xl transition-all transform hover:scale-105 z-50 hidden">
            <i class="fas fa-map-marked-alt mr-2"></i>
            <span class="font-semibold">Hotel Map</span>
        </button>

        <!-- Map Modal -->
        <div id="mapModal" class="hidden fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div class="relative bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
                <button onclick="closeMapModal()" 
                        class="absolute top-4 right-4 bg-white hover:bg-gray-100 text-gray-800 w-10 h-10 rounded-full shadow-lg z-10 flex items-center justify-center">
                    <i class="fas fa-times text-xl"></i>
                </button>
                <div class="p-6">
                    <h2 class="text-3xl font-bold mb-4 flex items-center">
                        <i id="mapModalIcon" class="fas fa-map mr-3"></i>
                        Hotel Map & Layout
                    </h2>
                    <div id="hotel-map-container" class="rounded-xl overflow-hidden">
                        <!-- Loaded dynamically -->
                    </div>
                </div>
            </div>
        </div>

        <script>
        const propertySlug = '${property_slug}';
        let propertyData = null;
        let allOfferings = [];
        let allActivities = [];
        let customSections = [];
        let currentFilter = 'all';
        let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
        
        // Track QR code scan on page load
        async function trackQRScan() {
          try {
            await fetch('/api/track-scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                property_id: propertyData?.property_id || 1
              })
            });
          } catch (error) {
            console.error('Failed to track scan:', error);
          }
        }
        
        // Track page view
        async function trackPageView(pageType, pageId) {
          try {
            await fetch('/api/track-page-view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                property_id: propertyData?.property_id || 1,
                page_type: pageType,
                page_id: pageId
              })
            });
          } catch (error) {
            console.error('Failed to track page view:', error);
          }
        }
        
        // Translation dictionaries for UI elements
        const uiTranslations = {
            en: {
                'pill-all': 'All',
                'pill-restaurants': 'Restaurants',
                'pill-events': 'Events',
                'pill-spa': 'Spa',
                'pill-services': 'Services',
                'pill-activities': 'Activities',
                'book-now': 'BOOK NOW',
                'reservations': 'Reservations',
                'explore-menu': 'Explore Menu',
                'learn-more': 'Learn More',
                'discover': 'Discover',
                'view-details': 'View Details',
                'explore-more': 'Explore More',
                'activities-experiences': 'Activities & Experiences',
                'curated-experiences': 'Curated experiences from our trusted partners',
                'hotel-map': 'Hotel Map & Layout',
                'no-restaurants': 'No restaurants available',
                'no-events': 'No upcoming events',
                'no-spa': 'No spa services available',
                'no-services': 'No services available',
                'no-activities': 'No activities available',
                'no-items': 'No items available in this section'
            },
            es: {
                'book-now': 'RESERVAR AHORA',
                'reservations': 'Reservas',
                'explore-menu': 'Explorar Men\u00fa',
                'learn-more': 'Saber M\u00e1s',
                'discover': 'Descubrir',
                'view-details': 'Ver Detalles',
                'explore-more': 'Explorar M\u00e1s',
                'activities-experiences': 'Actividades y Experiencias',
                'curated-experiences': 'Experiencias seleccionadas de nuestros socios de confianza',
                'hotel-map': 'Mapa y Dise\u00f1o del Hotel',
                'no-restaurants': 'No hay restaurantes disponibles',
                'no-events': 'No hay eventos pr\u00f3ximos',
                'no-spa': 'No hay servicios de spa disponibles',
                'no-services': 'No hay servicios disponibles',
                'no-activities': 'No hay actividades disponibles',
                'no-items': 'No hay elementos disponibles en esta secci\u00f3n'
            },
            fr: {
                'book-now': 'R\u00c9SERVER MAINTENANT',
                'reservations': 'R\u00e9servations',
                'explore-menu': 'Explorer le Menu',
                'learn-more': 'En Savoir Plus',
                'discover': 'D\u00e9couvrir',
                'view-details': 'Voir les D\u00e9tails',
                'explore-more': 'Explorer Plus',
                'activities-experiences': 'Activit\u00e9s et Exp\u00e9riences',
                'curated-experiences': 'Exp\u00e9riences s\u00e9lectionn\u00e9es par nos partenaires de confiance',
                'hotel-map': 'Plan et Agencement de l\\'H\u00f4tel',
                'no-restaurants': 'Aucun restaurant disponible',
                'no-events': 'Aucun \u00e9v\u00e9nement \u00e0 venir',
                'no-spa': 'Aucun service de spa disponible',
                'no-services': 'Aucun service disponible',
                'no-activities': 'Aucune activit\u00e9 disponible',
                'no-items': 'Aucun \u00e9l\u00e9ment disponible dans cette section'
            },
            de: {
                'book-now': 'JETZT BUCHEN',
                'reservations': 'Reservierungen',
                'explore-menu': 'Men\u00fc Erkunden',
                'learn-more': 'Mehr Erfahren',
                'discover': 'Entdecken',
                'view-details': 'Details Anzeigen',
                'explore-more': 'Mehr Erkunden',
                'activities-experiences': 'Aktivit\u00e4ten und Erlebnisse',
                'curated-experiences': 'Ausgew\u00e4hlte Erlebnisse von unseren vertrauensw\u00fcrdigen Partnern',
                'hotel-map': 'Hotelplan und Layout',
                'no-restaurants': 'Keine Restaurants verf\u00fcgbar',
                'no-events': 'Keine bevorstehenden Veranstaltungen',
                'no-spa': 'Keine Spa-Dienstleistungen verf\u00fcgbar',
                'no-services': 'Keine Dienstleistungen verf\u00fcgbar',
                'no-activities': 'Keine Aktivit\u00e4ten verf\u00fcgbar',
                'no-items': 'Keine Elemente in diesem Bereich verf\u00fcgbar'
            },
            it: {
                'book-now': 'PRENOTA ORA',
                'reservations': 'Prenotazioni',
                'explore-menu': 'Esplora il Menu',
                'learn-more': 'Scopri di Pi\u00f9',
                'discover': 'Scopri',
                'view-details': 'Vedi Dettagli',
                'explore-more': 'Esplora di Pi\u00f9',
                'activities-experiences': 'Attivit\u00e0 ed Esperienze',
                'curated-experiences': 'Esperienze selezionate dai nostri partner fidati',
                'hotel-map': 'Mappa e Layout dell\\'Hotel',
                'no-restaurants': 'Nessun ristorante disponibile',
                'no-events': 'Nessun evento in arrivo',
                'no-spa': 'Nessun servizio spa disponibile',
                'no-services': 'Nessun servizio disponibile',
                'no-activities': 'Nessuna attivit\u00e0 disponibile',
                'no-items': 'Nessun elemento disponibile in questa sezione'
            },
            pt: {
                'book-now': 'RESERVAR AGORA',
                'reservations': 'Reservas',
                'explore-menu': 'Explorar Menu',
                'learn-more': 'Saiba Mais',
                'discover': 'Descobrir',
                'view-details': 'Ver Detalhes',
                'explore-more': 'Explorar Mais',
                'activities-experiences': 'Atividades e Experi\u00eancias',
                'curated-experiences': 'Experi\u00eancias selecionadas de nossos parceiros confi\u00e1veis',
                'hotel-map': 'Mapa e Layout do Hotel',
                'no-restaurants': 'Nenhum restaurante dispon\u00edvel',
                'no-events': 'Nenhum evento pr\u00f3ximo',
                'no-spa': 'Nenhum servi\u00e7o de spa dispon\u00edvel',
                'no-services': 'Nenhum servi\u00e7o dispon\u00edvel',
                'no-activities': 'Nenhuma atividade dispon\u00edvel',
                'no-items': 'Nenhum item dispon\u00edvel nesta se\u00e7\u00e3o'
            },
            ru: {
                'book-now': '\u0417\u0410\u0411\u0420\u041e\u041d\u0418\u0420\u041e\u0412\u0410\u0422\u042c \u0421\u0415\u0419\u0427\u0410\u0421',
                'reservations': '\u0411\u0440\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f',
                'explore-menu': '\u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043c\u0435\u043d\u044e',
                'learn-more': '\u0423\u0437\u043d\u0430\u0442\u044c \u0431\u043e\u043b\u044c\u0448\u0435',
                'discover': '\u041e\u0442\u043a\u0440\u044b\u0442\u044c',
                'view-details': '\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0441\u0442\u0438',
                'explore-more': '\u0418\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u044c \u0431\u043e\u043b\u044c\u0448\u0435',
                'activities-experiences': '\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u0438 \u043e\u043f\u044b\u0442',
                'curated-experiences': '\u0422\u0449\u0430\u0442\u0435\u043b\u044c\u043d\u043e \u043e\u0442\u043e\u0431\u0440\u0430\u043d\u043d\u044b\u0435 \u0432\u043f\u0435\u0447\u0430\u0442\u043b\u0435\u043d\u0438\u044f \u043e\u0442 \u043d\u0430\u0448\u0438\u0445 \u043d\u0430\u0434\u0435\u0436\u043d\u044b\u0445 \u043f\u0430\u0440\u0442\u043d\u0435\u0440\u043e\u0432',
                'hotel-map': '\u041a\u0430\u0440\u0442\u0430 \u0438 \u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u043a\u0430 \u043e\u0442\u0435\u043b\u044f',
                'no-restaurants': '\u0420\u0435\u0441\u0442\u043e\u0440\u0430\u043d\u044b \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b',
                'no-events': '\u041d\u0435\u0442 \u043f\u0440\u0435\u0434\u0441\u0442\u043e\u044f\u0449\u0438\u0445 \u0441\u043e\u0431\u044b\u0442\u0438\u0439',
                'no-spa': '\u0421\u043f\u0430-\u0443\u0441\u043b\u0443\u0433\u0438 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b',
                'no-services': '\u0423\u0441\u043b\u0443\u0433\u0438 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b',
                'no-activities': '\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b',
                'no-items': '\u041d\u0435\u0442 \u044d\u043b\u0435\u043c\u0435\u043d\u0442\u043e\u0432 \u0432 \u044d\u0442\u043e\u043c \u0440\u0430\u0437\u0434\u0435\u043b\u0435'
            },
            ar: {
                'book-now': '\u0627\u062d\u062c\u0632 \u0627\u0644\u0622\u0646',
                'reservations': '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a',
                'explore-menu': '\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0642\u0627\u0626\u0645\u0629',
                'learn-more': '\u0627\u0639\u0631\u0641 \u0627\u0644\u0645\u0632\u064a\u062f',
                'discover': '\u0627\u0643\u062a\u0634\u0641',
                'view-details': '\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644',
                'explore-more': '\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0645\u0632\u064a\u062f',
                'activities-experiences': '\u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0648\u0627\u0644\u062a\u062c\u0627\u0631\u0628',
                'curated-experiences': '\u062a\u062c\u0627\u0631\u0628 \u0645\u0646\u062a\u0642\u0627\u0629 \u0645\u0646 \u0634\u0631\u0643\u0627\u0626\u0646\u0627 \u0627\u0644\u0645\u0648\u062b\u0648\u0642\u064a\u0646',
                'hotel-map': '\u062e\u0631\u064a\u0637\u0629 \u0648\u062a\u0635\u0645\u064a\u0645 \u0627\u0644\u0641\u0646\u062f\u0642',
                'no-restaurants': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0637\u0627\u0639\u0645 \u0645\u062a\u0627\u062d\u0629',
                'no-events': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u0639\u0627\u0644\u064a\u0627\u062a \u0642\u0627\u062f\u0645\u0629',
                'no-spa': '\u0644\u0627 \u062a\u0648\u062c\u062f \u062e\u062f\u0645\u0627\u062a \u0633\u0628\u0627 \u0645\u062a\u0627\u062d\u0629',
                'no-services': '\u0644\u0627 \u062a\u0648\u062c\u062f \u062e\u062f\u0645\u0627\u062a \u0645\u062a\u0627\u062d\u0629',
                'no-activities': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0646\u0634\u0637\u0629 \u0645\u062a\u0627\u062d\u0629',
                'no-items': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0646\u0627\u0635\u0631 \u0645\u062a\u0627\u062d\u0629 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645'
            },
            zh: {
                'book-now': '\u7acb\u5373\u9884\u8ba2',
                'reservations': '\u9884\u8ba2',
                'explore-menu': '\u63a2\u7d22\u83dc\u5355',
                'learn-more': '\u4e86\u89e3\u66f4\u591a',
                'discover': '\u53d1\u73b0',
                'view-details': '\u67e5\u770b\u8be6\u60c5',
                'explore-more': '\u63a2\u7d22\u66f4\u591a',
                'activities-experiences': '\u6d3b\u52a8\u548c\u4f53\u9a8c',
                'curated-experiences': '\u7531\u6211\u4eec\u7684\u53ef\u4fe1\u8d56\u5408\u4f5c\u4f19\u4f34\u7cbe\u9009\u7684\u4f53\u9a8c',
                'hotel-map': '\u9152\u5e97\u5730\u56fe\u548c\u5e03\u5c40',
                'no-restaurants': '\u6ca1\u6709\u53ef\u7528\u7684\u9910\u5385',
                'no-events': '\u6ca1\u6709\u5373\u5c06\u4e3e\u884c\u7684\u6d3b\u52a8',
                'no-spa': '\u6ca1\u6709\u53ef\u7528\u7684\u6c34\u7597\u670d\u52a1',
                'no-services': '\u6ca1\u6709\u53ef\u7528\u7684\u670d\u52a1',
                'no-activities': '\u6ca1\u6709\u53ef\u7528\u7684\u6d3b\u52a8',
                'no-items': '\u6b64\u90e8\u5206\u4e2d\u6ca1\u6709\u53ef\u7528\u9879\u76ee'
            }
        };
        
        // Get UI translation
        function t(key) {
            const dict = uiTranslations[currentLanguage] || uiTranslations['en'];
            return dict[key] || uiTranslations['en'][key] || key;
        }
        
        // Helper function to get translated field
        function getTranslatedField(item, fieldName) {
            if (!item) return '';
            
            // If English, use _en field
            if (currentLanguage === 'en') {
                return item[fieldName + '_en'] || item[fieldName] || '';
            }
            
            // Try translated field first (e.g., title_es, title_fr)
            const translatedField = item[fieldName + '_' + currentLanguage];
            if (translatedField) {
                return translatedField;
            }
            
            // Fallback to English
            return item[fieldName + '_en'] || item[fieldName] || '';
        }
        
        // Update section headings based on language
        function updateSectionHeadings() {
            if (!propertyData) {
              console.error('❌ propertyData is null!');
              return;
            }
            
            console.log('📰 Updating section headings with language:', currentLanguage);
            
            // Update default section headings
            const sections = ['restaurants', 'events', 'spa', 'service', 'activities'];
            sections.forEach(section => {
                const el = document.getElementById('section-heading-' + section);
                if (el) {
                    const fieldName = 'section_' + section;
                    const translated = getTranslatedField(propertyData, fieldName);
                    console.log('  ' + section + ': "' + translated + '"');
                    if (translated) {
                        el.textContent = translated;
                    }
                }
                
                // Also update filter pill buttons
                const pillEl = document.getElementById('pill-' + section);
                if (pillEl) {
                    const fieldName = 'section_' + section;
                    const translated = getTranslatedField(propertyData, fieldName);
                    if (translated) {
                        pillEl.textContent = translated;
                    }
                }
            });
            
            // Update all data-i18n elements (except pill buttons which are handled above)
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                // Skip category pills as they use custom section names
                if (key && key.startsWith('pill-')) {
                    return;
                }
                const translated = t(key);
                if (translated && translated !== key) {
                    el.textContent = translated;
                }
            });
            
            // Update hotel map heading
            const mapHeading = document.querySelector('#hotel-map-section h2 span');
            if (mapHeading) {
                mapHeading.textContent = t('hotel-map');
            }
        }
        
        // Change language function
        function changeLanguage() {
            const selector = document.getElementById('languageSelector');
            const newLang = selector.value;
            
            console.log('🌐 Changing language to:', newLang);
            
            // CRITICAL: Save to localStorage FIRST
            localStorage.setItem('preferredLanguage', newLang);
            
            // Verify it's saved
            const saved = localStorage.getItem('preferredLanguage');
            console.log('✅ Saved to localStorage:', saved);
            
            if (saved !== newLang) {
                console.error('❌ localStorage save FAILED!');
                return;
            }
            
            // RELOAD THE ENTIRE PAGE - cleanest approach
            console.log('🔄 Reloading page with new language...');
            window.location.reload();
        }

        function applyDesignSettings(settings) {
          // Font family mapping
          const fontMap = {
            'inter': "'Inter', system-ui, sans-serif",
            'poppins': "'Poppins', sans-serif",
            'playfair': "'Playfair Display', serif",
            'montserrat': "'Montserrat', sans-serif",
            'lora': "'Lora', serif"
          };
          
          const primaryColor = settings.primary_color || '#3B82F6';
          const secondaryColor = settings.secondary_color || '#10B981';
          const accentColor = settings.accent_color || '#F59E0B';
          const fontFamily = fontMap[settings.font_family] || fontMap['inter'];
          const layoutStyle = settings.layout_style || 'modern';
          const buttonStyle = settings.button_style || 'rounded';
          const cardStyle = settings.card_style || 'shadow';
          const headerStyle = settings.header_style || 'transparent';
          const useGradient = settings.use_gradient || 0;
          const heroImageEffect = settings.hero_image_effect || 'none';
          const heroOverlay = (settings.hero_overlay_opacity || 30) / 100;
          
          // Logo - add to propertyLogo container (Facebook Profile Style)
          const logoContainer = document.getElementById('propertyLogo');
          if (logoContainer) {
            if (settings.brand_logo_url) {
              // Replace placeholder with actual logo
              logoContainer.innerHTML = '<img src="' + settings.brand_logo_url + '" alt="Logo" class="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg border-4 border-white bg-white" />';
            }
            // If no logo, keep the placeholder (hotel icon)
          }
          
          // Gradient or solid color
          const heroBackground = useGradient ? 
            'linear-gradient(135deg, ' + primaryColor + ' 0%, ' + secondaryColor + ' 100%)' : 
            primaryColor;
          
          // Hero image filter effects
          let heroFilter = '';
          if (heroImageEffect === 'grayscale') heroFilter = 'grayscale(100%)';
          else if (heroImageEffect === 'sepia') heroFilter = 'sepia(80%)';
          else if (heroImageEffect === 'blur') heroFilter = 'blur(4px)';
          
          // Hero background with image and overlay
          const heroImageCSS = settings.hero_image_url ? 
            'background-image: linear-gradient(rgba(0,0,0,' + heroOverlay + '), rgba(0,0,0,' + heroOverlay + ')), url(\\'' + settings.hero_image_url + '\\'); background-size: cover; background-position: center; ' + (heroFilter ? 'filter: ' + heroFilter + ';' : '')
            : '';
          
          // Generate dynamic CSS based on layout style
          let dynamicCSS = '';
          
          if (layoutStyle === 'modern') {
            // Modern: Rounded cards, soft shadows, vibrant colors
            dynamicCSS = \`
              body {
                font-family: \${fontFamily};
                background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
              }
              
              .gradient-hero {
                background: \${heroBackground};
                position: relative;
                \${heroImageCSS}
              }
              
              .offering-card {
                background: white;
                border-radius: 1.5rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                overflow: hidden;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
              }
              
              .offering-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 12px 24px rgba(0,0,0,0.15);
              }
              
              .offering-card img {
                border-radius: 0;
              }
              
              .category-pill {
                border-radius: 9999px;
                padding: 0.75rem 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              
              .category-pill.bg-blue-500 {
                background: \${useGradient ? heroBackground : primaryColor} !important;
              }
              
              button, .btn {
                border-radius: \${buttonStyle === 'pill' ? '9999px' : '0.75rem'};
                font-weight: 600;
                transition: all 0.3s ease;
              }
              
              .text-blue-500, .text-blue-600 {
                color: \${primaryColor} !important;
              }
              
              .bg-blue-600 {
                background: \${useGradient ? heroBackground : primaryColor} !important;
              }
              
              .bg-blue-600:hover {
                background: \${secondaryColor} !important;
                transform: scale(1.05);
              }
              
              .text-green-600 { color: \${secondaryColor} !important; }
              .text-orange-600 { color: \${accentColor} !important; }
              .bg-green-100 { background-color: \${secondaryColor}22 !important; color: \${secondaryColor} !important; }
              .bg-blue-100 { background-color: \${primaryColor}22 !important; color: \${primaryColor} !important; }
              
              /* Floating Map Button */
              #mapFloatingBtn {
                background: \${primaryColor} !important;
              }
              #mapFloatingBtn:hover {
                background: \${secondaryColor} !important;
              }
              #mapModalIcon {
                color: \${primaryColor} !important;
              }
            \`;
          } else if (layoutStyle === 'elegant') {
            // Elegant: Borders, subtle colors, refined typography
            dynamicCSS = \`
              body {
                font-family: \${fontFamily};
                background: #fafafa;
              }
              
              .gradient-hero {
                background: \${heroBackground};
                position: relative;
                \${heroImageCSS}
              }
              
              .offering-card {
                background: white;
                border-radius: 0.25rem;
                border: 2px solid #e5e7eb;
                overflow: hidden;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
              }
              
              .offering-card:hover {
                border-color: \${primaryColor};
                box-shadow: 0 0 0 1px \${primaryColor};
              }
              
              .offering-card img {
                border-bottom: 1px solid #e5e7eb;
              }
              
              .category-pill {
                border-radius: 0.25rem;
                padding: 0.5rem 1.25rem;
                border: 1px solid currentColor;
                background: transparent !important;
                color: #374151;
                font-weight: 500;
                letter-spacing: 0.05em;
              }
              
              .category-pill.bg-blue-500 {
                background: \${primaryColor} !important;
                color: white !important;
                border-color: \${primaryColor} !important;
              }
              
              button, .btn {
                border-radius: 0.25rem;
                font-weight: 500;
                letter-spacing: 0.05em;
                border: 1px solid currentColor;
              }
              
              .text-blue-500, .text-blue-600 {
                color: \${primaryColor} !important;
              }
              
              .bg-blue-600 {
                background: \${primaryColor} !important;
                border-color: \${primaryColor} !important;
              }
              
              .bg-blue-600:hover {
                background: white !important;
                color: \${primaryColor} !important;
              }
              
              .text-green-600 { color: \${secondaryColor} !important; }
              .text-orange-600 { color: \${accentColor} !important; }
              .bg-green-100 { background-color: transparent !important; color: \${secondaryColor} !important; border: 1px solid \${secondaryColor}; }
              .bg-blue-100 { background-color: transparent !important; color: \${primaryColor} !important; border: 1px solid \${primaryColor}; }
              
              /* Floating Map Button */
              #mapFloatingBtn {
                background: \${primaryColor} !important;
              }
              #mapFloatingBtn:hover {
                background: \${secondaryColor} !important;
              }
              #mapModalIcon {
                color: \${primaryColor} !important;
              }
            \`;
          } else if (layoutStyle === 'minimal') {
            // Minimal: Flat, clean, lots of whitespace
            dynamicCSS = \`
              body {
                font-family: \${fontFamily};
                background: white;
              }
              
              .gradient-hero {
                background: \${heroBackground};
                padding: 6rem 1rem 3rem;
                position: relative;
                \${heroImageCSS}
              }
              
              .offering-card {
                background: #f9fafb;
                border-radius: 0.5rem;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                transition: background-color 0.2s ease;
              }
              
              .offering-card:hover {
                background: white;
              }
              
              .offering-card img {
                border-radius: 0;
              }
              
              .category-pill {
                border-radius: 0.375rem;
                padding: 0.5rem 1rem;
                background: #f3f4f6 !important;
                color: #374151;
                font-weight: 500;
                font-size: 0.875rem;
              }
              
              .category-pill.bg-blue-500 {
                background: \${primaryColor} !important;
                color: white !important;
              }
              
              button, .btn {
                border-radius: 0.5rem;
                font-weight: 600;
                padding: 0.75rem 1.5rem;
              }
              
              .text-blue-500, .text-blue-600 {
                color: \${primaryColor} !important;
              }
              
              .bg-blue-600 {
                background: \${primaryColor} !important;
              }
              
              .bg-blue-600:hover {
                opacity: 0.9;
              }
              
              .text-green-600 { color: \${secondaryColor} !important; }
              .text-orange-600 { color: \${accentColor} !important; }
              .bg-green-100 { background-color: \${secondaryColor}11 !important; color: \${secondaryColor} !important; }
              .bg-blue-100 { background-color: \${primaryColor}11 !important; color: \${primaryColor} !important; }
              
              /* Floating Map Button */
              #mapFloatingBtn {
                background: \${primaryColor} !important;
              }
              #mapFloatingBtn:hover {
                background: \${secondaryColor} !important;
              }
              #mapModalIcon {
                color: \${primaryColor} !important;
              }
            \`;
          }
          
          document.getElementById('dynamic-styles').textContent = dynamicCSS;
        }

        // Translation helpers
        const translations = {
          en: { all: 'All', restaurants: 'Restaurants', events: 'Events', spa: 'Spa', services: 'Services', activities: 'Activities' },
          ar: { all: 'الكل', restaurants: 'مطاعم', events: 'فعاليات', spa: 'سبا', services: 'خدمات', activities: 'أنشطة' },
          de: { all: 'Alle', restaurants: 'Restaurants', events: 'Veranstaltungen', spa: 'Spa', services: 'Dienstleistungen', activities: 'Aktivitäten' },
          ru: { all: 'Все', restaurants: 'Рестораны', events: 'События', spa: 'Спа', services: 'Услуги', activities: 'Мероприятия' },
          pl: { all: 'Wszystko', restaurants: 'Restauracje', events: 'Wydarzenia', spa: 'Spa', services: 'Usługi', activities: 'Zajęcia' },
          it: { all: 'Tutti', restaurants: 'Ristoranti', events: 'Eventi', spa: 'Spa', services: 'Servizi', activities: 'Attività' },
          fr: { all: 'Tout', restaurants: 'Restaurants', events: 'Événements', spa: 'Spa', services: 'Services', activities: 'Activités' },
          cs: { all: 'Vše', restaurants: 'Restaurace', events: 'Akce', spa: 'Spa', services: 'Služby', activities: 'Aktivity' },
          uk: { all: 'Все', restaurants: 'Ресторани', events: 'Події', spa: 'Спа', services: 'Послуги', activities: 'Заходи' }
        };

        function applySectionTranslations(propertyData) {
          const lang = currentLanguage;
          
          // Update section headings
          const sections = ['restaurants', 'events', 'spa', 'service', 'activities'];
          sections.forEach(section => {
            const headingEl = document.getElementById(\`section-heading-\${section}\`);
            if (headingEl) {
              const key = \`section_\${section}_\${lang}\`;
              headingEl.textContent = propertyData[key] || propertyData[\`section_\${section}_en\`] || headingEl.textContent;
            }
          });
          
          // Update category pills with custom section names from propertyData
          console.log('🏷️ Updating category pills in applySectionTranslations...');
          document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key === 'pill-all') {
              el.textContent = translations[lang].all;
            } else if (key === 'pill-restaurants') {
              const customName = getTranslatedField(propertyData, 'section_restaurants');
              console.log('  pill-restaurants: getTranslatedField returned:', customName);
              el.textContent = customName || translations[lang].restaurants;
              console.log('  pill-restaurants: final value:', el.textContent);
            } else if (key === 'pill-events') {
              const customName = getTranslatedField(propertyData, 'section_events');
              el.textContent = customName || translations[lang].events;
            } else if (key === 'pill-spa') {
              const customName = getTranslatedField(propertyData, 'section_spa');
              el.textContent = customName || translations[lang].spa;
            } else if (key === 'pill-services') {
              const customName = getTranslatedField(propertyData, 'section_service');
              el.textContent = customName || translations[lang].services;
            } else if (key === 'pill-activities') {
              const customName = getTranslatedField(propertyData, 'section_activities');
              el.textContent = customName || translations[lang].activities;
            }
          });
        }

        // Global HTML escape function to prevent syntax errors
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        function renderCategoryPills() {
          const container = document.getElementById('category-pills-container');
          if (!container) {
            console.error('❌ category-pills-container NOT FOUND!');
            return;
          }
          
          const lang = currentLanguage;
          const t = translations[lang] || translations.en;
          
          // Always show "All" pill
          let pillsHTML = \`
            <button onclick="filterOfferings('all')" class="category-pill bg-blue-500 text-white" data-category="all">
              <i class="fas fa-th-large mr-2"></i><span data-i18n="pill-all">\${t.all}</span>
            </button>
          \`;
          
          // Add default section pills only if visible (using custom section names)
          if (propertyData?.show_restaurants === 1) {
            const customName = getTranslatedField(propertyData, 'section_restaurants') || t.restaurants;
            pillsHTML += \`
              <button onclick="filterOfferings('restaurant')" class="category-pill bg-gray-200 text-gray-700" data-category="restaurant">
                <i class="fas fa-utensils mr-2"></i><span data-i18n="pill-restaurants">\${customName}</span>
              </button>
            \`;
          }
          
          if (propertyData?.show_events === 1) {
            const customName = getTranslatedField(propertyData, 'section_events') || t.events;
            pillsHTML += \`
              <button onclick="filterOfferings('event')" class="category-pill bg-gray-200 text-gray-700" data-category="event">
                <i class="fas fa-calendar-star mr-2"></i><span data-i18n="pill-events">\${customName}</span>
              </button>
            \`;
          }
          
          if (propertyData?.show_spa === 1) {
            const customName = getTranslatedField(propertyData, 'section_spa') || t.spa;
            pillsHTML += \`
              <button onclick="filterOfferings('spa')" class="category-pill bg-gray-200 text-gray-700" data-category="spa">
                <i class="fas fa-spa mr-2"></i><span data-i18n="pill-spa">\${customName}</span>
              </button>
            \`;
          }
          
          if (propertyData?.show_service === 1) {
            const customName = getTranslatedField(propertyData, 'section_service') || t.services;
            pillsHTML += \`
              <button onclick="filterOfferings('service')" class="category-pill bg-gray-200 text-gray-700" data-category="service">
                <i class="fas fa-concierge-bell mr-2"></i><span data-i18n="pill-services">\${customName}</span>
              </button>
            \`;
          }
          
          if (propertyData?.show_activities === 1) {
            const customName = getTranslatedField(propertyData, 'section_activities') || t.activities;
            pillsHTML += \`
              <button onclick="filterOfferings('activities')" class="category-pill bg-gray-200 text-gray-700" data-category="activities">
                <i class="fas fa-hiking mr-2"></i><span data-i18n="pill-activities">\${customName}</span>
              </button>
            \`;
          }
          
          // Add custom section pills only if visible
          customSections.forEach(section => {
            if (section.is_visible === 1) {
              const sectionName = section[\`section_name_\${lang}\`] || section.section_name_en;
              const icon = section.icon_class || 'fas fa-star';
              pillsHTML += \`
                <button onclick="filterOfferings('\${section.section_key}')" class="category-pill bg-gray-200 text-gray-700" data-category="\${section.section_key}">
                  <i class="\${icon} mr-2"></i><span>\${sectionName}</span>
                </button>
              \`;
            }
          });
          
          // FORCE CLEAR FIRST to prevent cached HTML
          container.innerHTML = '';
          
          // Then set new content with slight delay
          setTimeout(() => {
            container.innerHTML = pillsHTML;
          }, 100);
        }

        async function init() {
            try {
                // Get property details
                const propResponse = await fetch(\`/api/properties?slug=\${propertySlug}\`);
                const propData = await propResponse.json();
                
                if (!propData.properties || propData.properties.length === 0) {
                    throw new Error('Property not found');
                }
                
                propertyData = propData.properties[0];
                document.getElementById('propertyName').textContent = propertyData.name;
                if (propertyData.tagline) {
                  document.getElementById('propertyTagline').textContent = propertyData.tagline;
                }
                document.title = propertyData.name;
                
                // Track QR scan
                trackQRScan();
                
                // Apply design settings
                applyDesignSettings(propertyData);
                
                // Apply translations to section headings
                applySectionTranslations(propertyData);
                
                // Load info pages after property data is loaded
                loadInfoPages();
                
                // Load hotel offerings with language
                const offeringsResponse = await fetch(\`/api/hotel-offerings/\${propertyData.property_id}?lang=\${currentLanguage}\`);
                const offeringsData = await offeringsResponse.json();
                allOfferings = offeringsData.offerings || [];
                
                // Load vendor activities with language
                const activitiesResponse = await fetch(\`/api/property-vendor-activities/\${propertyData.property_id}?lang=\${currentLanguage}\`);
                const activitiesData = await activitiesResponse.json();
                allActivities = activitiesData.activities || [];
                
                // Load custom sections
                const customSectionsResponse = await fetch(\`/api/admin/custom-sections?property_id=\${propertyData.property_id}\`);
                const customSectionsData = await customSectionsResponse.json();
                customSections = customSectionsData.sections || [];
                
                // Render category pills including custom sections
                renderCategoryPills();
                
                // Render all content
                renderContent();
                
                // Update section headings with translations
                updateSectionHeadings();
                
                // Hide loading, show content
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
                
                // Initialize chatbot after all data is loaded
                if (typeof initChatbot === 'function') {
                    initChatbot();
                }
                
            } catch (error) {
                console.error('Initialization error:', error);
                console.error('Error details:', error.message, error.stack);
                document.getElementById('loading').innerHTML = \`
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                        <p class="text-gray-600">Unable to load content</p>
                        <p class="text-sm text-red-600 mt-2">Error: \${error.message || 'Unknown error'}</p>
                        <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg">
                            Try Again
                        </button>
                    </div>
                \`;
            }
        }

        function renderContent() {
            // Get section order from property settings
            const sectionOrder = propertyData.homepage_section_order ? 
              JSON.parse(propertyData.homepage_section_order) : 
              ['restaurants', 'events', 'spa', 'service', 'activities'];
            
            // Get container
            const container = document.querySelector('.max-w-6xl.mx-auto.px-4.py-6');
            
            // Collect all section elements
            const sectionElements = {
              'restaurants': document.getElementById('restaurants-section'),
              'events': document.getElementById('events-section'),
              'spa': document.getElementById('spa-section'),
              'service': document.getElementById('service-section'),
              'activities': document.getElementById('activities-section'),
              'hotel-map': document.getElementById('hotel-map-section')
            };
            
            // Create and add custom section elements dynamically
            customSections.forEach(section => {
              if (section.is_visible === 1) {
                let customSectionEl = document.getElementById(\`custom-section-\${section.section_key}\`);
                
                // Create if doesn't exist
                if (!customSectionEl) {
                  customSectionEl = document.createElement('section');
                  customSectionEl.id = \`custom-section-\${section.section_key}\`;
                  customSectionEl.className = 'mb-12';
                  
                  const lang = currentLanguage;
                  const sectionName = section['section_name_' + lang] || section.section_name_en;
                  const icon = section.icon_class || 'fas fa-star';
                  
                  customSectionEl.innerHTML = '<h2 class="text-2xl font-bold mb-4 flex items-center">' +
                    '<i class="' + icon + ' text-blue-500 mr-3"></i>' +
                    '<span>' + sectionName + '</span>' +
                    '</h2>' +
                    '<div id="custom-grid-' + section.section_key + '" class="grid grid-cols-1 gap-4">' +
                    '<!-- Loaded dynamically -->' +
                    '</div>';
                }
                
                sectionElements[section.section_key] = customSectionEl;
              }
            });
            
            // Detach all sections
            Object.values(sectionElements).forEach(el => {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });
            
            // Re-append in specified order
            sectionOrder.forEach(section => {
              if (sectionElements[section]) {
                container.appendChild(sectionElements[section]);
              }
            });
            
            // Always append hotel map at the end
            if (sectionElements['hotel-map']) {
              container.appendChild(sectionElements['hotel-map']);
            }
            
            // Render each section's content
            renderRestaurants();
            renderEvents();
            renderSpa();
            renderServices();
            renderActivities();
            renderHotelMap();
            
            // Render custom sections
            customSections.forEach(section => {
              if (section.is_visible === 1) {
                renderCustomSection(section.section_key);
              }
            });
            
            updateSectionVisibility();
        }

        function renderRestaurants() {
            const restaurants = allOfferings.filter(o => o.offering_type === 'restaurant');
            const grid = document.getElementById('restaurants-grid');
            
            if (!grid) {
                console.error('restaurants-grid element not found');
                return;
            }
            
            if (restaurants.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No restaurants available</p>';
                return;
            }
            
            grid.innerHTML = restaurants.map(r => {
                const title = getTranslatedField(r, 'title');
                const description = getTranslatedField(r, 'short_description');
                return \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300" onclick="viewOffering(\${r.offering_id})">
                    <div class="relative">
                        <img src="\${r.images[0] || '/static/placeholder.jpg'}" 
                             alt="\${title}" 
                             class="w-full h-48 object-cover">
                        <div class="absolute top-3 right-3">
                            \${r.requires_booking ? '<span class="bg-white/95 backdrop-blur-sm text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"><i class="fas fa-calendar-check mr-1"></i>' + t('reservations') + '</span>' : ''}
                        </div>
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-xl mb-2 text-gray-800">\${title}</h3>
                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">\${description}</p>
                        <div class="flex items-center text-sm text-gray-500 mb-4">
                            <i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>
                            <span>\${r.location}</span>
                        </div>
                        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="text-xs text-gray-400 uppercase tracking-wider font-medium">\${t('explore-menu')}</span>
                            <i class="fas fa-arrow-right text-blue-600"></i>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function renderEvents() {
            const events = allOfferings.filter(o => o.offering_type === 'event');
            const grid = document.getElementById('events-grid');
            
            if (!grid) {
                console.error('events-grid element not found');
                return;
            }
            
            if (events.length === 0) {
                grid.innerHTML = '<p class="text-gray-500">No upcoming events</p>';
                return;
            }
            
            grid.innerHTML = events.map(e => {
                const title = getTranslatedField(e, 'title');
                const description = getTranslatedField(e, 'short_description');
                return \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300" onclick="viewOffering(\${e.offering_id})">
                    <div class="relative">
                        <img src="\${e.images[0] || '/static/placeholder.jpg'}" 
                             alt="\${title}" 
                             class="w-full h-48 object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div class="absolute bottom-3 left-3 right-3">
                            \${e.event_date ? '<span class="bg-white/95 backdrop-blur-sm text-purple-600 px-3 py-1.5 rounded-full text-xs font-medium inline-block shadow-lg"><i class="fas fa-calendar mr-1"></i>' + new Date(e.event_date).toLocaleDateString() + '</span>' : ''}
                        </div>
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-xl mb-2 text-gray-800">\${title}</h3>
                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">\${description}</p>
                        <div class="flex items-center gap-3 text-sm text-gray-500 mb-4">
                            \${e.event_start_time ? '<span><i class="fas fa-clock mr-2 text-gray-400"></i>' + e.event_start_time + '</span>' : ''}
                        </div>
                        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="text-xs text-gray-400 uppercase tracking-wider font-medium">\${t('learn-more')}</span>
                            <i class="fas fa-arrow-right text-purple-600"></i>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function renderSpa() {
            const spa = allOfferings.filter(o => o.offering_type === 'spa');
            const grid = document.getElementById('spa-grid');
            
            if (!grid) {
                console.error('spa-grid element not found');
                return;
            }
            
            if (spa.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No spa services available</p>';
                return;
            }
            
            grid.innerHTML = spa.map(s => {
                const title = getTranslatedField(s, 'title');
                const description = getTranslatedField(s, 'short_description');
                return \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300" onclick="viewOffering(\${s.offering_id})">
                    <div class="relative">
                        <img src="\${s.images[0] || '/static/placeholder.jpg'}" 
                             alt="\${title}" 
                             class="w-full h-48 object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-emerald-900/40 via-transparent to-transparent"></div>
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-xl mb-2 text-gray-800">\${title}</h3>
                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">\${description}</p>
                        <div class="flex items-center text-sm text-gray-500 mb-4">
                            <i class="fas fa-clock mr-2 text-gray-400"></i>
                            <span>\${s.duration_minutes} minutes</span>
                        </div>
                        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="text-xs text-gray-400 uppercase tracking-wider font-medium">\${t('discover')}</span>
                            <i class="fas fa-arrow-right text-green-600"></i>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function renderServices() {
            const services = allOfferings.filter(o => o.offering_type === 'service');
            const grid = document.getElementById('service-grid');
            
            if (!grid) {
                console.error('service-grid element not found');
                return;
            }
            
            if (services.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No services available</p>';
                return;
            }
            
            grid.innerHTML = services.map(s => {
                const title = getTranslatedField(s, 'title');
                const description = getTranslatedField(s, 'short_description');
                return \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300" onclick="viewOffering(\${s.offering_id})">
                    <div class="relative">
                        <img src="\${s.images[0] || '/static/placeholder.jpg'}" 
                             alt="\${title}" 
                             class="w-full h-48 object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-indigo-900/40 via-transparent to-transparent"></div>
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-xl mb-2 text-gray-800">\${title}</h3>
                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">\${description}</p>
                        \${s.location ? '<div class="flex items-center text-sm text-gray-500 mb-4"><i class="fas fa-map-marker-alt mr-2 text-gray-400"></i><span>' + s.location + '</span></div>' : ''}
                        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="text-xs text-gray-400 uppercase tracking-wider font-medium">\${t('view-details')}</span>
                            <i class="fas fa-arrow-right text-indigo-600"></i>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function renderActivities() {
            const grid = document.getElementById('activities-grid');
            
            if (!grid) {
                console.error('activities-grid element not found');
                return;
            }
            
            if (allActivities.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No activities available</p>';
                return;
            }
            
            grid.innerHTML = allActivities.map(a => {
                // Use global escapeHtml to prevent syntax errors from special characters
                const safeTitle = escapeHtml(a.title);
                const safeDescription = escapeHtml(a.short_description);
                const safeBusinessName = escapeHtml(a.business_name);
                const safeCategoryName = escapeHtml(a.category_name);
                
                return \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300" onclick="viewActivity(\${a.activity_id})">
                    <div class="relative">
                        <img src="\${a.images[0] || '/static/placeholder.jpg'}" 
                             alt="\${safeTitle}" 
                             class="w-full h-48 object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-orange-900/40 via-transparent to-transparent"></div>
                        <div class="absolute top-3 right-3">
                            <span class="bg-white/95 backdrop-blur-sm text-orange-600 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">\${safeCategoryName}</span>
                        </div>
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-xl mb-1 text-gray-800">\${safeTitle}</h3>
                        <p class="text-xs text-gray-500 mb-3">Curated by \${safeBusinessName}</p>
                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">\${safeDescription}</p>
                        <div class="flex items-center text-sm text-gray-500 mb-4">
                            <i class="fas fa-clock mr-2 text-gray-400"></i>
                            <span>\${a.duration_minutes} minutes</span>
                        </div>
                        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="text-xs text-gray-400 uppercase tracking-wider font-medium">\${t('book-now')}</span>
                            <i class="fas fa-arrow-right text-orange-600"></i>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }
        
        function renderCustomSection(sectionKey) {
            // Filter offerings by custom_section_key
            const sectionOfferings = allOfferings.filter(o => 
              o.offering_type === 'custom' && o.custom_section_key === sectionKey
            );
            
            const grid = document.getElementById(\`custom-grid-\${sectionKey}\`);
            
            if (!grid) {
                console.error(\`custom-grid-\${sectionKey} element not found\`);
                return;
            }
            
            if (sectionOfferings.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No items available in this section</p>';
                return;
            }
            
            // Render as elegant cards (similar to other sections)
            grid.innerHTML = sectionOfferings.map(o => {
                const title = getTranslatedField(o, 'title');
                const description = getTranslatedField(o, 'short_description');
                return \`
                <div class="offering-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300" onclick="viewOffering(\${o.offering_id})">
                    <div class="relative">
                        <img src="\${o.images[0] || '/static/placeholder.jpg'}" 
                             alt="\${title}" 
                             class="w-full h-48 object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                        <div class="absolute top-3 right-3">
                            \${o.requires_booking ? '<span class="bg-white/95 backdrop-blur-sm text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"><i class="fas fa-calendar-check mr-1"></i>' + t('reservations') + '</span>' : ''}
                        </div>
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-xl mb-2 text-gray-800">\${title}</h3>
                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">\${description}</p>
                        \${o.location ? \`
                            <div class="flex items-center text-sm text-gray-500 mb-4">
                                <i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>
                                <span>\${o.location}</span>
                            </div>
                        \` : ''}
                        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="text-sm text-blue-600 font-medium hover:text-blue-700 transition">
                                <i class="fas fa-arrow-right mr-1"></i>\${t('explore-more')}
                            </span>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function renderHotelMap() {
            const mapFloatingBtn = document.getElementById('mapFloatingBtn');
            const mapContainer = document.getElementById('hotel-map-container');
            
            if (!mapFloatingBtn || !mapContainer) {
                console.error('map elements not found');
                return;
            }
            
            if (propertyData.show_hotel_map === 1 && propertyData.hotel_map_url) {
                // Show floating button
                mapFloatingBtn.classList.remove('hidden');
                
                // Populate map container
                mapContainer.innerHTML = \`
                    <img src="\${propertyData.hotel_map_url}" 
                         alt="Hotel Map" 
                         class="w-full h-auto rounded-lg"
                         style="max-height: 80vh; object-fit: contain;">
                \`;
            } else {
                // Hide floating button if no map
                mapFloatingBtn.classList.add('hidden');
            }
        }
        
        function openMapModal() {
            document.getElementById('mapModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        
        function closeMapModal() {
            document.getElementById('mapModal').classList.add('hidden');
            document.body.style.overflow = 'auto';
        }

        function updateSectionVisibility() {
            const sections = {
                'restaurants': { el: document.getElementById('restaurants-section'), visible: propertyData?.show_restaurants === 1 },
                'events': { el: document.getElementById('events-section'), visible: propertyData?.show_events === 1 },
                'spa': { el: document.getElementById('spa-section'), visible: propertyData?.show_spa === 1 },
                'service': { el: document.getElementById('service-section'), visible: propertyData?.show_service === 1 },
                'activities': { el: document.getElementById('activities-section'), visible: propertyData?.show_activities === 1 }
            };
            
            // Add custom sections
            customSections.forEach(cs => {
                sections[cs.section_key] = {
                    el: document.getElementById(\`custom-section-\${cs.section_key}\`),
                    visible: cs.is_visible === 1
                };
            });
            
            // Map filter values to section keys (handle singular/plural)
            const filterToSectionMap = {
                'all': 'all',
                'restaurant': 'restaurants',
                'event': 'events',
                'spa': 'spa',
                'service': 'service',
                'activities': 'activities'
            };
            
            const mappedFilter = filterToSectionMap[currentFilter] || currentFilter;
            
            // Apply filter
            Object.keys(sections).forEach(key => {
                const section = sections[key];
                if (!section.el) return;
                
                if (mappedFilter === 'all') {
                    // Show if enabled in settings
                    section.el.style.display = section.visible ? 'block' : 'none';
                } else {
                    // Show only the filtered section (if enabled)
                    section.el.style.display = (key === mappedFilter && section.visible) ? 'block' : 'none';
                }
            });
        }

        function filterOfferings(category) {
            currentFilter = category;
            
            // Track page view for the section
            if (category !== 'all') {
                trackPageView(category, null);
            }
            
            // Update pill styles
            document.querySelectorAll('.category-pill').forEach(pill => {
                if (pill.dataset.category === category) {
                    pill.className = 'category-pill bg-blue-500 text-white';
                } else {
                    pill.className = 'category-pill bg-gray-200 text-gray-700';
                }
            });
            
            updateSectionVisibility();
        }

        function viewOffering(offeringId) {
            trackPageView('offering', String(offeringId));
            window.location.href = '/offering-detail?id=' + offeringId + '&property=' + propertyData.property_id + '&lang=' + currentLanguage;
        }

        function viewActivity(activityId) {
            trackPageView('activity', String(activityId));
            window.location.href = '/activity?id=' + activityId + '&property=' + propertyData.property_id + '&lang=' + currentLanguage;
        }

        // Initialize on DOM ready
        document.addEventListener('DOMContentLoaded', function() {
            // CRITICAL: Re-read language from localStorage on page load
            const savedLang = localStorage.getItem('preferredLanguage');
            if (savedLang) {
                currentLanguage = savedLang;
                console.log('📖 Loaded language from localStorage:', savedLang);
            }
            
            // Set language selector value after DOM is loaded
            const languageSelector = document.getElementById('languageSelector');
            if (languageSelector) {
                languageSelector.value = currentLanguage;
                console.log('🎯 Language selector initialized to:', currentLanguage);
            }
            
            // Initialize the page
            init().then(() => {
                // Double-check selector value after init
                if (languageSelector) {
                    languageSelector.value = currentLanguage;
                }
                
                // Initialize seasonal effects
                initSeasonalEffects();
                
                // Initialize chatbot (must run after propertyData is loaded)
                if (typeof window.initChatbot === 'function') {
                    window.initChatbot();
                }
            });
        });
        
        // Seasonal Effects (inline)
        async function initSeasonalEffects() {
          if (!propertyData) return;
          
          try {
            const response = await fetch('/api/seasonal-settings/' + propertyData.property_id);
            const data = await response.json();
            
            if (data.success && data.settings && data.settings.is_active) {
              const s = data.settings;
              
              // Custom message banner
              if (s.custom_message) {
                const banner = document.createElement('div');
                const primaryColor = propertyData.primary_color || '#3B82F6';
                banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:linear-gradient(135deg,' + primaryColor + ',#ffffff);color:white;text-align:center;padding:12px;font-size:18px;font-weight:bold;z-index:10000;box-shadow:0 2px 10px rgba(0,0,0,0.2);animation:slideDown 0.5s;text-shadow: 1px 1px 2px rgba(0,0,0,0.3)';
                banner.textContent = s.custom_message;
                document.body.appendChild(banner);
                document.body.style.paddingTop = '48px';
              }
              
              // Snow effect
              if (s.enable_snow) {
                const snow = document.createElement('div');
                snow.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden';
                for (let i = 0; i < 30; i++) {
                  const flake = document.createElement('div');
                  flake.innerHTML = '❄';
                  flake.style.cssText = 'position:absolute;color:#fff;font-size:' + (Math.random() * 10 + 10) + 'px;left:' + (Math.random() * 100) + '%;animation:snowfall ' + (Math.random() * 3 + 2) + 's linear infinite;opacity:' + (Math.random() * 0.6 + 0.4);
                  flake.style.animationDelay = Math.random() * 2 + 's';
                  snow.appendChild(flake);
                }
                document.body.appendChild(snow);
                if (!document.getElementById('snow-style')) {
                  const style = document.createElement('style');
                  style.id = 'snow-style';
                  style.textContent = '@keyframes snowfall{0%{top:-10%;transform:translateX(0) rotate(0deg)}100%{top:110%;transform:translateX(50px) rotate(360deg)}}@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}';
                  document.head.appendChild(style);
                }
              }
              
              // Confetti effect
              if (s.enable_confetti) {
                const confetti = document.createElement('div');
                confetti.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;overflow:hidden';
                const colors = ['#f44336','#e91e63','#9c27b0','#3f51b5','#2196f3','#4caf50','#ffeb3b','#ff9800'];
                for (let i = 0; i < 50; i++) {
                  setTimeout(() => {
                    const piece = document.createElement('div');
                    piece.style.cssText = 'position:absolute;width:' + (Math.random() * 6 + 4) + 'px;height:' + (Math.random() * 10 + 5) + 'px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';left:' + (Math.random() * 100) + '%;animation:confettifall ' + (Math.random() * 3 + 2) + 's linear infinite';
                    confetti.appendChild(piece);
                  }, i * 30);
                }
                document.body.appendChild(confetti);
                if (!document.getElementById('confetti-style')) {
                  const style = document.createElement('style');
                  style.id = 'confetti-style';
                  style.textContent = '@keyframes confettifall{0%{top:-10%;transform:rotate(0deg)}100%{top:110%;transform:rotate(720deg)}}';
                  document.head.appendChild(style);
                }
              }
              
              // Festive lights
              if (s.enable_lights) {
                const lights = document.createElement('div');
                lights.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:50px;pointer-events:none;z-index:9996;display:flex;justify-content:space-around';
                const colors = ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff'];
                for (let i = 0; i < 15; i++) {
                  const light = document.createElement('div');
                  light.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + colors[i % colors.length] + ';animation:twinkle ' + (Math.random() * 2 + 1) + 's ease-in-out infinite;box-shadow:0 0 10px ' + colors[i % colors.length];
                  light.style.animationDelay = Math.random() + 's';
                  lights.appendChild(light);
                }
                document.body.appendChild(lights);
                if (!document.getElementById('lights-style')) {
                  const style = document.createElement('style');
                  style.id = 'lights-style';
                  style.textContent = '@keyframes twinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.8)}}';
                  document.head.appendChild(style);
                }
              }
            }
          } catch (error) {
            console.error('Seasonal effects error:', error);
          }
        }

        // ============================================
        // INFO PAGES - GUEST INTERFACE
        // ============================================
        
        let infoPages = [];

        async function loadInfoPages() {
          try {
            if (!propertyData || !propertyData.property_id) {
              console.log('⏳ Property data not loaded yet, skipping info pages load');
              return;
            }
            const response = await fetch('/api/info-pages/' + propertyData.property_id);
            const data = await response.json();
            if (data.success) {
              infoPages = data.pages;
            }
          } catch (error) {
            console.error('Load info pages error:', error);
          }
        }

        window.openInfoMenu = function() {
          document.getElementById('infoMenuModal').classList.remove('hidden');
          displayInfoMenu();
        }

        window.closeInfoMenu = function() {
          document.getElementById('infoMenuModal').classList.add('hidden');
        }

        function displayInfoMenu() {
          const container = document.getElementById('infoMenuList');
          
          if (infoPages.length === 0) {
            container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-info-circle text-4xl mb-3"></i><p>No information pages available</p></div>';
            return;
          }

          // Use primary color from settings for all info page buttons
          const primaryColor = propertyData.primary_color || '#3B82F6';

          let html = '';
          infoPages.forEach(page => {
            const title = page['title_' + currentLanguage] || page.title_en;
            
            html += '<button onclick="openInfoPage(&quot;' + page.page_key + '&quot;)" class="w-full text-white p-4 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 text-left" style="background: linear-gradient(135deg, ' + primaryColor + ' 0%, ' + primaryColor + 'dd 100%);">' +
              '<div class="flex items-center gap-3">' +
                '<i class="' + page.icon_class + ' text-2xl"></i>' +
                '<span class="font-bold text-lg">' + title + '</span>' +
                '<i class="fas fa-chevron-right ml-auto"></i>' +
              '</div>' +
            '</button>';
          });

          container.innerHTML = html;
        }

        window.openInfoPage = async function(pageKey) {
          try {
            const response = await fetch('/api/info-page/' + propertyData.property_id + '/' + pageKey);
            const data = await response.json();
            
            if (data.success) {
              displayInfoPage(data.page);
              closeInfoMenu();
            }
          } catch (error) {
            console.error('Open info page error:', error);
            alert('Failed to load page');
          }
        }

        function displayInfoPage(page) {
          const title = page['title_' + currentLanguage] || page.title_en;
          const content = page['content_' + currentLanguage] || page.content_en;
          
          document.getElementById('infoPageTitle').innerHTML = '<i class="' + page.icon_class + ' mr-3"></i>' + title;
          document.getElementById('infoPageContent').innerHTML = content;
          
          // Apply custom colors from propertyData
          const primaryColor = propertyData.primary_color || '#3B82F6';
          const infoPageHeader = document.getElementById('infoPageHeader');
          const infoPageCloseFooterBtn = document.getElementById('infoPageCloseFooterBtn');
          
          if (infoPageHeader) {
            infoPageHeader.style.background = 'linear-gradient(135deg, ' + primaryColor + ' 0%, #ffffff 100%)';
          }
          if (infoPageCloseFooterBtn) {
            infoPageCloseFooterBtn.style.background = primaryColor;
          }
          
          document.getElementById('infoPageModal').classList.remove('hidden');
        }

        window.closeInfoPage = function() {
          document.getElementById('infoPageModal').classList.add('hidden');
        }

        // Info pages will be loaded after propertyData is loaded (in main init)
        
        </script>

        <!-- Info Menu Modal -->
        <div id="infoMenuModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-scale-up">
                <!-- Header -->
                <div id="infoModalHeader" class="p-6 flex justify-between items-center">
                    <h2 id="infoModalTitle" class="text-2xl font-bold"><i class="fas fa-info-circle mr-2"></i>Hotel Information</h2>
                    <button id="infoModalCloseBtn" onclick="closeInfoMenu()" class="hover:opacity-80 transition">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <!-- Info Pages List -->
                <div id="infoMenuList" class="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
                    <div class="text-center py-8 text-gray-400">
                        <i class="fas fa-spinner fa-spin text-3xl"></i>
                        <p class="mt-2">Loading...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Info Page Display Modal -->
        <div id="infoPageModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden z-50 overflow-y-auto">
            <div class="min-h-screen p-4 flex items-center justify-center">
                <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 animate-scale-up">
                    <!-- Header -->
                    <div id="infoPageHeader" class="p-6 rounded-t-2xl flex justify-between items-center bg-gradient-to-r from-blue-500 to-white">
                        <h2 id="infoPageTitle" class="text-2xl md:text-3xl font-bold flex items-center text-white">Loading...</h2>
                        <button id="infoPageCloseBtn" onclick="closeInfoPage()" class="text-white hover:opacity-80 transition">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <!-- Content -->
                    <div id="infoPageContent" class="p-6 md:p-8 prose prose-lg max-w-none overflow-y-auto max-h-[70vh] text-gray-800">
                        <!-- Content will be injected here -->
                    </div>
                    
                    <!-- Footer -->
                    <div class="bg-gray-50 p-4 rounded-b-2xl flex justify-end">
                        <button id="infoPageCloseFooterBtn" onclick="closeInfoPage()" class="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold transition">
                            <i class="fas fa-times mr-2"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <style>
          @keyframes scale-up {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          .animate-scale-up {
            animation: scale-up 0.2s ease-out;
          }

          /* Prose styling for info page content */
          .prose {
            color: #374151;
          }
          .prose h2 {
            color: #1f2937;
            font-weight: 700;
            font-size: 1.875rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .prose h3 {
            color: #374151;
            font-weight: 600;
            font-size: 1.5rem;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
          }
          .prose p {
            margin-bottom: 1rem;
            line-height: 1.75;
          }
          .prose ul, .prose ol {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
          }
          .prose li {
            margin-bottom: 0.5rem;
          }
          .prose table {
            width: 100%;
            margin-bottom: 1rem;
          }
          .prose th {
            background-color: #f3f4f6;
            font-weight: 600;
            padding: 0.75rem;
            text-align: left;
          }
          .prose td {
            padding: 0.75rem;
          }
          .prose strong {
            font-weight: 700;
            color: #1f2937;
          }
          .prose em {
            font-style: italic;
          }
        </style>
        
        <!-- AI Chatbot Widget -->
        <div id="chatbotWidget" style="display: none;">
          <!-- Chat Button -->
          <button id="chatbotButton" class="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform duration-300 z-50" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <i class="fas fa-comments"></i>
          </button>
          
          <!-- Chat Window -->
          <div id="chatWindow" class="hidden fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
            <!-- Header -->
            <div class="p-4 rounded-t-2xl text-white flex items-center justify-between" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <i class="fas fa-robot text-xl"></i>
                </div>
                <div>
                  <h3 id="chatbotName" class="font-bold">Hotel Assistant</h3>
                  <p class="text-xs opacity-90">Always here to help</p>
                </div>
              </div>
              <button id="closeChatBtn" class="text-white/80 hover:text-white transition">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <!-- Messages Container -->
            <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              <!-- Messages will be added here -->
            </div>
            
            <!-- Input Area -->
            <div class="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <div class="flex gap-2">
                <input type="text" id="chatInput" placeholder="Ask me anything..." class="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500">
                <button id="sendChatBtn" class="w-12 h-12 rounded-full text-white flex items-center justify-center hover:scale-105 transition" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                  <i class="fas fa-paper-plane"></i>
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2 text-center">
                <span id="chatUsageInfo">AI-powered by hotel knowledge base</span>
              </p>
            </div>
          </div>
        </div>
        
        <script>
          // Chatbot Widget JavaScript
          const chatbotWidget = document.getElementById('chatbotWidget');
          const chatButton = document.getElementById('chatbotButton');
          const chatWindow = document.getElementById('chatWindow');
          const closeChatBtn = document.getElementById('closeChatBtn');
          const chatMessages = document.getElementById('chatMessages');
          const chatInput = document.getElementById('chatInput');
          const sendChatBtn = document.getElementById('sendChatBtn');
          
          let chatConversationId = null;
          let chatSessionId = 'guest-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          
          // Load chatbot settings and show if enabled
          window.initChatbot = async function() {
              try {
                const response = await fetch('/api/chatbot/settings/' + propertyData.property_id);
                const data = await response.json();
                
                if (data.success && data.settings && data.settings.chatbot_enabled === 1) {
                  chatbotWidget.style.display = 'block';
                  document.getElementById('chatbotName').textContent = data.settings.chatbot_name || 'Hotel Assistant';
                  
                  // Add welcome message
                  const greeting = data.settings.chatbot_greeting_en || 'Hi! How can I help you today?';
                  addMessage(greeting, 'assistant');
                }
              } catch (error) {
                console.error('Chatbot init error:', error);
              }
            }
            
            // Toggle chat window
            chatButton.addEventListener('click', () => {
              chatWindow.classList.toggle('hidden');
              if (!chatWindow.classList.contains('hidden')) {
                chatInput.focus();
              }
            });
            
            closeChatBtn.addEventListener('click', () => {
              chatWindow.classList.add('hidden');
            });
            
            // Add message to chat
            function addMessage(text, role) {
              const messageDiv = document.createElement('div');
              messageDiv.className = role === 'user' ? 'flex justify-end' : 'flex justify-start';
              
              const bubble = document.createElement('div');
              bubble.className = role === 'user' 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%]'
                : 'bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-2xl rounded-tl-none max-w-[80%] shadow-sm';
              bubble.textContent = text;
              
              messageDiv.appendChild(bubble);
              chatMessages.appendChild(messageDiv);
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            // Send message
            async function sendMessage() {
              const message = chatInput.value.trim();
              if (!message) return;
              
              // Add user message
              addMessage(message, 'user');
              chatInput.value = '';
              
              // Show typing indicator
              const typingDiv = document.createElement('div');
              typingDiv.id = 'typing';
              typingDiv.className = 'flex justify-start';
              typingDiv.innerHTML = '<div class="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-tl-none"><i class="fas fa-ellipsis-h animate-pulse"></i></div>';
              chatMessages.appendChild(typingDiv);
              chatMessages.scrollTop = chatMessages.scrollHeight;
              
              try {
                const response = await fetch('/api/chatbot/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    property_id: propertyData.property_id,
                    session_id: chatSessionId,
                    message: message,
                    conversation_id: chatConversationId
                  })
                });
                
                const data = await response.json();
                
                // Remove typing indicator
                document.getElementById('typing')?.remove();
                
                if (data.success) {
                  chatConversationId = data.conversation_id;
                  addMessage(data.response, 'assistant');
                } else if (response.status === 429) {
                  addMessage(data.message || 'Rate limit exceeded. Please try again later.', 'assistant');
                } else {
                  addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
                }
              } catch (error) {
                console.error('Chat error:', error);
                document.getElementById('typing')?.remove();
                addMessage('Sorry, I am unable to respond right now. Please try again later.', 'assistant');
              }
            }
            
          sendChatBtn.addEventListener('click', sendMessage);
          chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          });
        </script>
    </body>
    </html>
  `)
})

// ============================================
// OFFERING DETAIL PAGE - Booking page for restaurants, events, spa
app.get('/offering-detail', async (c) => {
  const offering_id = c.req.query('id')
  const property_id = c.req.query('property')
  
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Now</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      /* Dynamic styles will be injected here */
      #dynamicStyles { }
    </style>
</head>
<body class="bg-gray-50">
    <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>

    <div id="translating" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div class="bg-white p-6 rounded-xl shadow-2xl flex items-center gap-4">
            <div class="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-500"></div>
            <span class="text-lg font-medium">Translating content...</span>
        </div>
    </div>

    <div id="content" class="hidden">
        <!-- Language Selector -->
        <div class="fixed top-4 right-4 z-50">
            <select id="languageSelector" class="px-4 py-2 border rounded-lg bg-white shadow-md">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
            </select>
        </div>

        <!-- Header -->
        <div id="offeringHeader" class="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-6 px-4">
            <div class="max-w-4xl mx-auto">
                <a id="backLink" href="#" class="text-white/80 hover:text-white mb-2 inline-block">
                    <i class="fas fa-arrow-left mr-2"></i><span data-i18n="back-to-hotel">Back to hotel</span>
                </a>
                <h1 class="text-3xl font-bold" id="offeringTitle">Loading...</h1>
                <p class="text-white/80" id="offeringLocation"></p>
            </div>
        </div>

        <!-- Main Content -->
        <div class="max-w-4xl mx-auto px-4 py-6">
            <!-- Offering Details -->
            <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                <img id="offeringImage" src="" alt="" class="w-full h-64 object-cover">
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-4" id="offeringMeta"></div>
                    <h2 class="text-2xl font-bold mb-3" data-i18n="about">About</h2>
                    <p class="text-gray-600 mb-6" id="offeringDescription"></p>
                    
                    <div id="eventDetails" class="hidden mb-6">
                        <h3 class="font-bold text-lg mb-2" data-i18n="event-details">Event Details</h3>
                        <div class="space-y-2 text-gray-700">
                            <div><i class="fas fa-calendar mr-2 text-blue-500"></i><span id="eventDate"></span></div>
                            <div><i class="fas fa-clock mr-2 text-blue-500"></i><span id="eventTime"></span></div>
                        </div>
                    </div>

                    <div id="restaurantMenus" class="hidden mb-6">
                        <h3 class="font-bold text-lg mb-3 flex items-center">
                            <i class="fas fa-utensils mr-2 text-orange-500"></i>
                            <span>Our Menus</span>
                        </h3>
                        <div id="menuGrid" class="grid gap-4 md:grid-cols-2">
                            <!-- Menus will be displayed here -->
                        </div>
                    </div>

                    <div id="bookingSection" class="border-t pt-6">
                        <h3 class="font-bold text-lg mb-4" data-i18n="book-experience">Book Your Experience</h3>
                        <form id="bookingForm" class="space-y-4">
                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium mb-2" data-i18n="your-name">Your Name</label>
                                    <input type="text" id="guestName" required class="w-full px-4 py-2 border rounded-lg">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-2" data-i18n="phone-number">Phone Number</label>
                                    <input type="tel" id="guestPhone" required class="w-full px-4 py-2 border rounded-lg">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2" data-i18n="email">Email</label>
                                <input type="email" id="guestEmail" required class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div id="restaurantFields" class="hidden">
                                <label class="block text-sm font-medium mb-2" data-i18n="preferred-datetime">Preferred Date & Time</label>
                                <input type="datetime-local" id="bookingDateTime" class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2" data-i18n="num-guests">Number of Guests</label>
                                <input type="number" id="numGuests" min="1" value="2" required class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2" data-i18n="special-requests">Special Requests (Optional)</label>
                                <textarea id="specialRequests" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea>
                            </div>
                            
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-medium" data-i18n="price-per-person">Price per person:</span>
                                    <span class="text-xl font-bold text-blue-600" id="priceDisplay"></span>
                                </div>
                                <div class="flex justify-between items-center text-gray-700">
                                    <span data-i18n="total">Total:</span>
                                    <span class="text-2xl font-bold" id="totalPrice">$0</span>
                                </div>
                            </div>

                            <button type="submit" class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700">
                                <i class="fas fa-check-circle mr-2"></i><span data-i18n="confirm-booking">Confirm Booking</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Get language from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const langFromUrl = urlParams.get('lang');
        let currentLanguage = langFromUrl || localStorage.getItem('preferredLanguage') || 'en';
        
        // Save to localStorage for persistence
        if (langFromUrl) {
            localStorage.setItem('preferredLanguage', langFromUrl);
        }
        
        let offeringData = null;
        let propertyData = null;
        const offeringId = '${offering_id}';
        const propertyId = '${property_id}';

        // Translation dictionary for UI elements
        const translations = {
            en: {
                'back-to-hotel': 'Back to hotel',
                'about': 'About',
                'event-details': 'Event Details',
                'book-experience': 'Book Your Experience',
                'your-name': 'Your Name',
                'phone-number': 'Phone Number',
                'email': 'Email',
                'preferred-datetime': 'Preferred Date & Time',
                'num-guests': 'Number of Guests',
                'special-requests': 'Special Requests (Optional)',
                'price-per-person': 'Price per person:',
                'total': 'Total:',
                'confirm-booking': 'Confirm Booking'
            },
            es: {
                'back-to-hotel': 'Volver al hotel',
                'about': 'Acerca de',
                'event-details': 'Detalles del evento',
                'book-experience': 'Reserva tu experiencia',
                'your-name': 'Tu nombre',
                'phone-number': 'Número de teléfono',
                'email': 'Correo electrónico',
                'preferred-datetime': 'Fecha y hora preferidas',
                'num-guests': 'Número de huéspedes',
                'special-requests': 'Solicitudes especiales (opcional)',
                'price-per-person': 'Precio por persona:',
                'total': 'Total:',
                'confirm-booking': 'Confirmar reserva'
            },
            fr: {
                'back-to-hotel': 'Retour à l\\'hôtel',
                'about': 'À propos',
                'event-details': 'Détails de l\\'événement',
                'book-experience': 'Réservez votre expérience',
                'your-name': 'Votre nom',
                'phone-number': 'Numéro de téléphone',
                'email': 'Email',
                'preferred-datetime': 'Date et heure préférées',
                'num-guests': 'Nombre d\\'invités',
                'special-requests': 'Demandes spéciales (facultatif)',
                'price-per-person': 'Prix par personne:',
                'total': 'Total:',
                'confirm-booking': 'Confirmer la réservation'
            },
            de: {
                'back-to-hotel': 'Zurück zum Hotel',
                'about': 'Über',
                'event-details': 'Veranstaltungsdetails',
                'book-experience': 'Buchen Sie Ihr Erlebnis',
                'your-name': 'Ihr Name',
                'phone-number': 'Telefonnummer',
                'email': 'E-Mail',
                'preferred-datetime': 'Bevorzugtes Datum und Uhrzeit',
                'num-guests': 'Anzahl der Gäste',
                'special-requests': 'Besondere Wünsche (optional)',
                'price-per-person': 'Preis pro Person:',
                'total': 'Gesamt:',
                'confirm-booking': 'Buchung bestätigen'
            },
            it: {
                'back-to-hotel': 'Torna all\\'hotel',
                'about': 'Informazioni',
                'event-details': 'Dettagli dell\\'evento',
                'book-experience': 'Prenota la tua esperienza',
                'your-name': 'Il tuo nome',
                'phone-number': 'Numero di telefono',
                'email': 'Email',
                'preferred-datetime': 'Data e ora preferite',
                'num-guests': 'Numero di ospiti',
                'special-requests': 'Richieste speciali (facoltativo)',
                'price-per-person': 'Prezzo per persona:',
                'total': 'Totale:',
                'confirm-booking': 'Conferma prenotazione'
            },
            pt: {
                'back-to-hotel': 'Voltar ao hotel',
                'about': 'Sobre',
                'event-details': 'Detalhes do evento',
                'book-experience': 'Reserve sua experiência',
                'your-name': 'Seu nome',
                'phone-number': 'Número de telefone',
                'email': 'Email',
                'preferred-datetime': 'Data e hora preferidas',
                'num-guests': 'Número de hóspedes',
                'special-requests': 'Solicitações especiais (opcional)',
                'price-per-person': 'Preço por pessoa:',
                'total': 'Total:',
                'confirm-booking': 'Confirmar reserva'
            },
            ru: {
                'back-to-hotel': 'Вернуться в отель',
                'about': 'О нас',
                'event-details': 'Детали мероприятия',
                'book-experience': 'Забронируйте свой опыт',
                'your-name': 'Ваше имя',
                'phone-number': 'Номер телефона',
                'email': 'Электронная почта',
                'preferred-datetime': 'Предпочтительные дата и время',
                'num-guests': 'Количество гостей',
                'special-requests': 'Особые пожелания (необязательно)',
                'price-per-person': 'Цена за человека:',
                'total': 'Итого:',
                'confirm-booking': 'Подтвердить бронирование'
            },
            ar: {
                'back-to-hotel': 'العودة إلى الفندق',
                'about': 'حول',
                'event-details': 'تفاصيل الحدث',
                'book-experience': 'احجز تجربتك',
                'your-name': 'اسمك',
                'phone-number': 'رقم الهاتف',
                'email': 'البريد الإلكتروني',
                'preferred-datetime': 'التاريخ والوقت المفضل',
                'num-guests': 'عدد الضيوف',
                'special-requests': 'الطلبات الخاصة (اختياري)',
                'price-per-person': 'السعر لكل شخص:',
                'total': 'المجموع:',
                'confirm-booking': 'تأكيد الحجز'
            },
            zh: {
                'back-to-hotel': '返回酒店',
                'about': '关于',
                'event-details': '活动详情',
                'book-experience': '预订您的体验',
                'your-name': '您的姓名',
                'phone-number': '电话号码',
                'email': '电子邮件',
                'preferred-datetime': '首选日期和时间',
                'num-guests': '客人数量',
                'special-requests': '特殊要求（可选）',
                'price-per-person': '每人价格：',
                'total': '总计：',
                'confirm-booking': '确认预订'
            }
        };

        async function init() {
            try {
                // Fetch property data for settings and slug
                const propResponse = await fetch('/api/properties?property_id=' + propertyId);
                const propData = await propResponse.json();
                propertyData = propData.properties && propData.properties[0];

                if (!propertyData) {
                    alert('Property not found');
                    return;
                }

                // Update back link with correct slug
                document.getElementById('backLink').href = '/hotel/' + (propertyData.slug || 'paradise-resort');

                // Fetch offering data
                const response = await fetch('/api/hotel-offerings/' + propertyId);
                const data = await response.json();
                const offerings = data.offerings || [];
                offeringData = offerings.find(o => o.offering_id == offeringId);

                if (!offeringData) {
                    alert('Offering not found');
                    window.location.href = '/hotel/' + (propertyData.slug || 'paradise-resort');
                    return;
                }

                // Apply design settings
                applyDesignSettings(propertyData);

                // Render offering with current language
                renderOffering();
                updateTranslations();

                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
            } catch (error) {
                console.error('Error loading offering:', error);
                alert('Failed to load offering details');
            }
        }

        function applyDesignSettings(settings) {
            const fontMap = {
                'inter': "'Inter', system-ui, sans-serif",
                'poppins': "'Poppins', sans-serif",
                'playfair': "'Playfair Display', serif",
                'montserrat': "'Montserrat', sans-serif",
                'lora': "'Lora', serif"
            };
            
            const primaryColor = settings.primary_color || '#3B82F6';
            const secondaryColor = settings.secondary_color || '#10B981';
            const fontFamily = fontMap[settings.font_family] || fontMap['inter'];
            const useGradient = settings.use_gradient || 0;
            
            const heroBackground = useGradient ? 
                'linear-gradient(135deg, ' + primaryColor + ' 0%, ' + secondaryColor + ' 100%)' : 
                primaryColor;
            
            // Apply dynamic CSS
            const style = document.createElement('style');
            style.textContent = 'body { font-family: ' + fontFamily + '; }' +
                '#offeringHeader { background: ' + heroBackground + ' !important; }' +
                '.text-blue-500, .text-blue-600 { color: ' + primaryColor + ' !important; }' +
                '.bg-blue-600 { background: ' + (useGradient ? heroBackground : primaryColor) + ' !important; }' +
                '.bg-blue-600:hover { background: ' + secondaryColor + ' !important; transform: scale(1.05); }' +
                '.bg-blue-50 { background: ' + primaryColor + '15 !important; }';
            document.head.appendChild(style);
            
            // Apply colors to Info button and modal (if they exist on this page)
            const infoButton = document.getElementById('infoButton');
            const infoModalHeader = document.getElementById('infoModalHeader');
            
            if (infoButton) {
                infoButton.style.background = primaryColor;
                infoButton.style.borderColor = primaryColor;
                infoButton.onmouseover = function() { this.style.opacity = '0.9'; };
                infoButton.onmouseout = function() { this.style.opacity = '1'; };
            }
            
            if (infoModalHeader) {
                infoModalHeader.style.background = 'linear-gradient(135deg, ' + primaryColor + ' 0%, #ffffff 100%)';
                const modalTitle = infoModalHeader.querySelector('h2');
                const modalCloseBtn = infoModalHeader.querySelector('button');
                if (modalTitle) {
                    modalTitle.style.color = primaryColor;
                }
                if (modalCloseBtn) {
                    modalCloseBtn.style.color = primaryColor;
                }
            }

            // Apply colors to Info Page modal (individual page view)
            const infoPageHeader = document.getElementById('infoPageHeader');
            const infoPageTitle = document.getElementById('infoPageTitle');
            const infoPageCloseBtn = document.getElementById('infoPageCloseBtn');
            const infoPageContent = document.getElementById('infoPageContent');
            const infoPageCloseFooterBtn = document.getElementById('infoPageCloseFooterBtn');

            if (infoPageHeader) {
                infoPageHeader.style.background = 'linear-gradient(135deg, ' + primaryColor + ' 0%, #ffffff 100%)';
            }
            if (infoPageTitle) {
                infoPageTitle.style.color = '#ffffff';
            }
            if (infoPageCloseBtn) {
                infoPageCloseBtn.style.color = '#ffffff';
            }
            if (infoPageContent) {
                infoPageContent.style.color = '#1f2937'; // Dark gray text for readability
            }
            if (infoPageCloseFooterBtn) {
                infoPageCloseFooterBtn.style.background = primaryColor;
                infoPageCloseFooterBtn.style.color = '#ffffff';
                infoPageCloseFooterBtn.onmouseover = function() { this.style.opacity = '0.9'; };
                infoPageCloseFooterBtn.onmouseout = function() { this.style.opacity = '1'; };
            }
        }

        function updateTranslations() {
            const lang = currentLanguage;
            const dict = translations[lang] || translations['en'];
            
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key]) {
                    el.textContent = dict[key];
                }
            });
        }

        async function translateContent(text, targetLang) {
            if (!text || targetLang === 'en') return text;
            
            try {
                // Call translation API
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        target_lang: targetLang,
                        context: 'hotel_offering_description',
                        persona: 'luxury_hospitality'
                    })
                });
                const data = await response.json();
                return data.translated_text || text;
            } catch (error) {
                console.error('Translation error:', error);
                return text;
            }
        }

        async function renderOffering() {
            // Show translating overlay if not English
            if (currentLanguage !== 'en') {
                document.getElementById('translating').classList.remove('hidden');
            }
            
            // Get language-specific field names
            const langSuffix = currentLanguage === 'en' ? '_en' : ('_' + currentLanguage);
            const titleField = 'title' + langSuffix;
            const shortDescField = 'short_description' + langSuffix;
            const fullDescField = 'full_description' + langSuffix;
            
            // Try to get translated content from database first
            let title = offeringData[titleField] || offeringData.title || offeringData.title_en;
            let description = offeringData[fullDescField] || offeringData[shortDescField] || offeringData.full_description || offeringData.short_description;
            let location = offeringData.location;
            
            try {
                // If no translation exists in database and language is not English, use AI translation
                if (currentLanguage !== 'en') {
                    console.log('Translating to', currentLanguage);
                    
                    if (!offeringData[titleField]) {
                        console.log('Translating title:', offeringData.title || offeringData.title_en);
                        title = await translateContent(offeringData.title || offeringData.title_en, currentLanguage);
                        console.log('Translated title:', title);
                    }
                    if (!offeringData[fullDescField] && !offeringData[shortDescField]) {
                        const originalDesc = offeringData.full_description || offeringData.short_description;
                        console.log('Translating description:', originalDesc);
                        description = await translateContent(originalDesc, currentLanguage);
                        console.log('Translated description:', description);
                    }
                    if (offeringData.location) {
                        console.log('Translating location:', offeringData.location);
                        location = await translateContent(offeringData.location, currentLanguage);
                        console.log('Translated location:', location);
                    }
                }
            } catch (error) {
                console.error('Translation rendering error:', error);
            } finally {
                // Hide translating overlay
                document.getElementById('translating').classList.add('hidden');
            }
            
            document.getElementById('offeringTitle').textContent = title;
            document.getElementById('offeringLocation').textContent = location || '';
            
            // Handle images - ensure it's an array
            let imageUrl = '/static/placeholder.jpg';
            if (offeringData.images) {
                console.log('Raw images data:', offeringData.images, 'Type:', typeof offeringData.images);
                // If images is a string, parse it
                if (typeof offeringData.images === 'string') {
                    try {
                        const parsedImages = JSON.parse(offeringData.images);
                        imageUrl = parsedImages[0] || imageUrl;
                    } catch (e) {
                        console.error('Failed to parse images:', e);
                        imageUrl = offeringData.images; // Use as-is if not JSON
                    }
                } else if (Array.isArray(offeringData.images) && offeringData.images.length > 0) {
                    imageUrl = offeringData.images[0];
                }
            }
            console.log('Setting image URL:', imageUrl);
            document.getElementById('offeringImage').src = imageUrl;
            
            document.getElementById('offeringDescription').textContent = description;
            document.getElementById('priceDisplay').textContent = (offeringData.currency || 'USD') + ' ' + (offeringData.price || '0');

            // Show/hide booking section based on requires_booking
            const bookingSection = document.getElementById('bookingSection');
            if (offeringData.requires_booking === 0) {
                bookingSection.classList.add('hidden');
            } else {
                bookingSection.classList.remove('hidden');
            }

            // Show event details if it's an event
            if (offeringData.offering_type === 'event' && offeringData.event_date) {
                document.getElementById('eventDetails').classList.remove('hidden');
                const date = new Date(offeringData.event_date);
                document.getElementById('eventDate').textContent = date.toLocaleDateString();
                if (offeringData.event_start_time) {
                    document.getElementById('eventTime').textContent = offeringData.event_start_time + (offeringData.event_end_time ? ' - ' + offeringData.event_end_time : '');
                }
            }

            // Show restaurant-specific fields and load menus
            if (offeringData.offering_type === 'restaurant') {
                document.getElementById('restaurantFields').classList.remove('hidden');
                loadRestaurantMenus();
            }

            updateTotalPrice();
        }

        async function loadRestaurantMenus() {
            try {
                const response = await fetch('/api/offerings/' + offeringId + '/menus');
                const data = await response.json();
                
                if (data.success && data.menus && data.menus.length > 0) {
                    document.getElementById('restaurantMenus').classList.remove('hidden');
                    const menuGrid = document.getElementById('menuGrid');
                    menuGrid.innerHTML = '';
                    
                    data.menus.forEach((menu, index) => {
                        const menuCard = document.createElement('div');
                        menuCard.className = 'bg-white border-2 border-orange-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer';
                        menuCard.onclick = () => window.open(menu.menu_url, '_blank');
                        
                        const img = document.createElement('img');
                        img.src = menu.menu_url;
                        img.alt = menu.menu_name;
                        img.className = 'w-full h-48 object-cover';
                        
                        const content = document.createElement('div');
                        content.className = 'p-3';
                        
                        const title = document.createElement('h4');
                        title.className = 'font-semibold text-center';
                        title.textContent = menu.menu_name;
                        
                        const hint = document.createElement('p');
                        hint.className = 'text-xs text-gray-500 text-center mt-1';
                        hint.innerHTML = '<i class="fas fa-external-link-alt mr-1"></i>Click to view full size';
                        
                        content.appendChild(title);
                        content.appendChild(hint);
                        menuCard.appendChild(img);
                        menuCard.appendChild(content);
                        menuGrid.appendChild(menuCard);
                    });
                } else {
                    document.getElementById('restaurantMenus').classList.add('hidden');
                }
            } catch (error) {
                console.error('Error loading menus:', error);
                document.getElementById('restaurantMenus').classList.add('hidden');
            }
        }

        function updateTotalPrice() {
            const numGuests = parseInt(document.getElementById('numGuests').value) || 1;
            const pricePerPerson = parseFloat(offeringData.price) || 0;
            const total = numGuests * pricePerPerson;
            document.getElementById('totalPrice').textContent = (offeringData.currency || 'USD') + ' ' + total.toFixed(2);
        }

        document.getElementById('numGuests').addEventListener('input', updateTotalPrice);

        // Language selector
        document.getElementById('languageSelector').addEventListener('change', async (e) => {
            currentLanguage = e.target.value;
            await renderOffering();
            updateTranslations();
        });

        document.getElementById('bookingForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const bookingData = {
                offering_id: offeringData.offering_id,
                property_id: propertyId,
                guest_name: document.getElementById('guestName').value,
                guest_email: document.getElementById('guestEmail').value,
                guest_phone: document.getElementById('guestPhone').value,
                num_guests: parseInt(document.getElementById('numGuests').value),
                booking_date: document.getElementById('bookingDateTime')?.value || new Date().toISOString(),
                special_requests: document.getElementById('specialRequests').value,
                total_amount: parseFloat(document.getElementById('totalPrice').textContent.replace(/[^0-9.]/g, ''))
            };

            try {
                const response = await fetch('/api/offering-booking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();
                if (result.success) {
                    alert('Booking confirmed! We will contact you shortly.');
                    window.location.href = '/hotel/paradise-resort';
                } else {
                    alert('Booking failed: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Booking error:', error);
                alert('Failed to submit booking. Please try again.');
            }
        });

        init();
    </script>
</body>
</html>
  `)
})

// GUEST WELCOME PAGE - QR Code Entry
// ============================================

app.get('/welcome/:property_slug/:room_token', async (c) => {
  const { property_slug, room_token } = c.req.param()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #0EA5E9 0%, #10B981 100%); }
          .activity-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
                <p class="mt-4 text-gray-600">Loading...</p>
            </div>
        </div>

        <div id="content" class="hidden">
            <div class="gradient-bg text-white py-8 px-4 sticky top-0 z-10 shadow-lg">
                <div class="max-w-6xl mx-auto">
                    <h1 class="text-3xl font-bold" id="propertyName">Paradise Resort</h1>
                    <p class="text-sm opacity-90">Room <span id="roomNumber">---</span></p>
                </div>
            </div>

            <div class="max-w-6xl mx-auto px-4 py-8">
                <h2 class="text-2xl font-bold mb-6">Featured Activities</h2>
                <div id="activities" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                
                <div class="mt-12 text-center">
                    <a href="/browse?property=1&token=" id="browseAll" class="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold">
                        Browse All Activities
                    </a>
                </div>
            </div>
        </div>

        <script>
        let sessionToken = '';
        
        async function init() {
            try {
                const response = await fetch('/api/welcome/${property_slug}/${room_token}');
                const data = await response.json();
                
                if (data.error) {
                    alert('Invalid QR code');
                    return;
                }
                
                sessionToken = data.session_token;
                document.getElementById('propertyName').textContent = data.property.name;
                document.getElementById('roomNumber').textContent = data.room.number;
                document.getElementById('browseAll').href += sessionToken;
                
                displayActivities(data.featured_activities);
                
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
            } catch (error) {
                console.error(error);
                alert('Error loading page');
            }
        }
        
        function displayActivities(activities) {
            const html = activities.map(a => \`
                <div class="activity-card bg-white rounded-lg shadow-lg overflow-hidden transition cursor-pointer" 
                     onclick="bookActivity(\${a.activity_id})">
                    <div class="h-48 bg-gradient-to-r from-blue-400 to-green-400"></div>
                    <div class="p-4">
                        <h3 class="text-lg font-bold mb-2">\${a.title_en || a.title}</h3>
                        <p class="text-sm text-gray-600 mb-3">\${a.vendor_name}</p>
                        <p class="text-sm text-gray-700 mb-4">\${(a.short_description_en || a.short_description || '').substring(0, 100)}...</p>
                        <div class="flex justify-between items-center">
                            <span class="text-2xl font-bold text-blue-600">\${a.currency} \${a.price}</span>
                            <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                                Book
                            </button>
                        </div>
                    </div>
                </div>
            \`).join('');
            
            document.getElementById('activities').innerHTML = html;
        }
        
        function bookActivity(id) {
            alert('Booking activity ' + id + '. Full booking interface will be available in the next update!' + String.fromCharCode(10) + String.fromCharCode(10) + 'For now, you can use the API directly to create bookings.');
        }
        
        window.addEventListener('DOMContentLoaded', init);
        </script>
    </body>
    </html>
  `)
})

// ============================================
// BROWSE ACTIVITIES PAGE
// ============================================

app.get('/browse', async (c) => {
  const propertyId = c.req.query('property') || '1'
  const token = c.req.query('token') || ''
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Browse Activities - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #0EA5E9 0%, #10B981 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="gradient-bg text-white py-4 px-4 sticky top-0 z-10 shadow-lg">
            <div class="max-w-6xl mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold">Browse Activities</h1>
                <button onclick="window.history.back()" class="bg-white/20 px-4 py-2 rounded-lg">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            </div>
        </div>

        <div class="max-w-6xl mx-auto px-4 py-8">
            <div class="mb-6 flex gap-4 overflow-x-auto pb-4" id="categories"></div>
            
            <div class="mb-6 flex justify-between items-center">
                <h2 class="text-2xl font-bold">All Activities</h2>
                <select id="sortSelect" onchange="loadActivities()" class="px-4 py-2 border rounded-lg">
                    <option value="popularity">Most Popular</option>
                    <option value="price">Lowest Price</option>
                    <option value="duration">Shortest Duration</option>
                </select>
            </div>
            
            <div id="activities" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>

        <script>
        const propertyId = '${propertyId}';
        const token = '${token}';
        let currentCategory = null;
        
        async function init() {
            await loadCategories();
            await loadActivities();
        }
        
        async function loadCategories() {
            const response = await fetch('/api/categories?lang=en');
            const data = await response.json();
            
            const html = '<button onclick="filterCategory(null)" class="flex-shrink-0 px-6 py-3 bg-white rounded-lg shadow">All</button>' +
                data.categories.map(c => \`
                    <button onclick="filterCategory('\${c.slug}')" 
                            class="flex-shrink-0 px-6 py-3 bg-white rounded-lg shadow hover:shadow-lg">
                        <i class="fas \${c.icon_name} text-blue-500"></i> \${c.name}
                    </button>
                \`).join('');
            
            document.getElementById('categories').innerHTML = html;
        }
        
        async function loadActivities() {
            const sort = document.getElementById('sortSelect').value;
            let url = \`/api/activities?property_id=\${propertyId}&sort=\${sort}&lang=en\`;
            if (currentCategory) url += \`&category=\${currentCategory}\`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            const html = data.activities.map(a => \`
                <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer"
                     onclick="viewActivity(\${a.activity_id})">
                    <div class="h-48 bg-gradient-to-r from-blue-400 to-green-400"></div>
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-lg font-bold">\${a.title}</h3>
                            \${a.is_featured ? '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Featured</span>' : ''}
                        </div>
                        <p class="text-sm text-gray-600 mb-2">\${a.vendor_name}</p>
                        <p class="text-sm text-gray-700 mb-3">\${a.short_description}</p>
                        <div class="flex justify-between items-center text-sm text-gray-600 mb-3">
                            <span><i class="far fa-clock"></i> \${a.duration_minutes} min</span>
                            <span><i class="far fa-user"></i> Max \${a.capacity_per_slot}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-2xl font-bold text-blue-600">\${a.currency} \${a.price}</span>
                            <button class="bg-blue-500 text-white px-4 py-2 rounded-lg">Book</button>
                        </div>
                    </div>
                </div>
            \`).join('');
            
            document.getElementById('activities').innerHTML = html;
        }
        
        function filterCategory(slug) {
            currentCategory = slug;
            loadActivities();
        }
        
        function viewActivity(id) {
            alert('Activity details for ID: ' + id + String.fromCharCode(10) + String.fromCharCode(10) + 'Full detail page coming soon!' + String.fromCharCode(10) + String.fromCharCode(10) + 'For now, use API endpoint: /api/activities/' + id);
        }
        
        window.addEventListener('DOMContentLoaded', init);
        </script>
    </body>
    </html>
  `)
})

// ============================================
// HTML PAGE ROUTES
// ============================================

// Vendor login page
app.get('/vendor/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vendor Login - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <h1 class="text-2xl font-bold mb-6 text-center">Vendor Portal Login</h1>
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Email</label>
                        <input type="email" id="email" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Password</label>
                        <input type="password" id="password" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
                        <i class="fas fa-sign-in-alt mr-2"></i>Login
                    </button>
                </form>
            </div>
        </div>
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
              const response = await fetch('/api/vendor/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              
              const data = await response.json();
              
              if (data.success) {
                localStorage.setItem('vendor_id', data.vendor.vendor_id);
                localStorage.setItem('vendor_token', data.token);
                localStorage.setItem('vendor_business_name', data.vendor.business_name);
                window.location.href = '/vendor/dashboard';
              } else {
                alert('Login failed: ' + (data.error || 'Invalid credentials'));
              }
            } catch (error) {
              console.error('Login error:', error);
              alert('Login failed. Please try again.');
            }
          });
        </script>
    </body>
    </html>
  `)
})

// Admin login page
// ============================================
// GUESTCONNECT PLATFORM SUPER ADMIN
// ============================================

// Super Admin Login
app.get('/superadmin/login', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GuestConnect Platform Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
                <i class="fas fa-crown text-white text-3xl"></i>
            </div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">GuestConnect</h1>
            <p class="text-gray-600 mt-2">Platform Super Admin</p>
        </div>

        <form id="loginForm" class="space-y-6">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" id="email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" id="password" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
            </div>
            <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition">
                <i class="fas fa-sign-in-alt mr-2"></i>Login to Platform Admin
            </button>
        </form>

        <div class="mt-6 text-center">
            <a href="/admin/login" class="text-sm text-gray-600 hover:text-purple-600">
                <i class="fas fa-hotel mr-1"></i>Hotel Admin Login
            </a>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Super admin credentials (hardcoded for now - you should change this!)
            if (email === 'superadmin@guestconnect.com' && password === 'GuestConnect2024!') {
                localStorage.setItem('superadmin_user', JSON.stringify({
                    user_id: 1,
                    email: email,
                    role: 'superadmin',
                    name: 'Platform Administrator'
                }));
                window.location.href = '/superadmin/dashboard';
            } else {
                alert('Invalid credentials');
            }
        });
    </script>
</body>
</html>
  `)
})

// Super Admin Dashboard
app.get('/superadmin/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GuestConnect Platform Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      .tab-active { border-bottom: 3px solid #9333EA; color: #9333EA; }
      .hidden { display: none !important; }
      .tab-content { display: block; }
      .tab-btn { cursor: pointer; transition: all 0.3s; }
      .tab-btn:hover { background-color: rgba(147, 51, 234, 0.1); }
      .stat-card { transition: transform 0.2s; }
      .stat-card:hover { transform: translateY(-4px); }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-purple-700 to-blue-700 text-white py-4 px-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold flex items-center">
                    <i class="fas fa-crown mr-3"></i>GuestConnect Platform Admin
                </h1>
                <p class="text-purple-100 text-sm">Manage all hotels and platform settings</p>
            </div>
            <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg">
                <i class="fas fa-sign-out-alt mr-2"></i>Logout
            </button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Platform Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Total Hotels</p>
                        <p class="text-3xl font-bold text-purple-600" id="totalHotels">0</p>
                    </div>
                    <div class="bg-purple-100 p-4 rounded-full">
                        <i class="fas fa-hotel text-purple-600 text-2xl"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Total Vendors</p>
                        <p class="text-3xl font-bold text-blue-600" id="totalVendors">0</p>
                    </div>
                    <div class="bg-blue-100 p-4 rounded-full">
                        <i class="fas fa-store text-blue-600 text-2xl"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Total Bookings</p>
                        <p class="text-3xl font-bold text-green-600" id="totalBookings">0</p>
                    </div>
                    <div class="bg-green-100 p-4 rounded-full">
                        <i class="fas fa-calendar-check text-green-600 text-2xl"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-sm">Platform Revenue</p>
                        <p class="text-3xl font-bold text-indigo-600" id="totalRevenue">$0</p>
                    </div>
                    <div class="bg-indigo-100 p-4 rounded-full">
                        <i class="fas fa-dollar-sign text-indigo-600 text-2xl"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white rounded-lg shadow mb-6">
            <div class="flex overflow-x-auto">
                <button data-tab="hotels" class="tab-btn px-6 py-4 font-semibold tab-active">
                    <i class="fas fa-hotel mr-2"></i>Hotels
                </button>
                <button data-tab="vendors" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-store mr-2"></i>Vendors
                </button>
                <button data-tab="bookings" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-calendar-alt mr-2"></i>All Bookings
                </button>
                <button data-tab="users" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-users mr-2"></i>Users
                </button>
                <button data-tab="support" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-ticket-alt mr-2"></i>Support
                </button>
                <button data-tab="chat" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-comments mr-2"></i>Live Chat
                </button>
                <button data-tab="analytics" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-chart-line mr-2"></i>Analytics
                </button>
                <button data-tab="settings" class="tab-btn px-6 py-4 font-semibold">
                    <i class="fas fa-cog mr-2"></i>Platform Settings
                </button>
            </div>
        </div>

        <!-- Users Management Tab -->
        <div id="usersTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold"><i class="fas fa-users mr-2 text-purple-600"></i>Platform Users</h2>
                    <div class="flex gap-3">
                        <select id="userTypeFilter" class="px-4 py-2 border rounded-lg">
                            <option value="all">All Types</option>
                            <option value="hotel">Hotel Admins</option>
                            <option value="vendor">Vendors</option>
                            <option value="superadmin">Super Admins</option>
                        </select>
                        <select id="userStatusFilter" class="px-4 py-2 border rounded-lg">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="inactive">Inactive</option>
                            <option value="pending">Pending</option>
                        </select>
                        <button onclick="loadUsers()" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                            <i class="fas fa-sync-alt mr-2"></i>Refresh
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Associated With</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersList" class="bg-white divide-y divide-gray-200"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Support Tickets Tab -->
        <div id="supportTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold"><i class="fas fa-ticket-alt mr-2 text-orange-600"></i>Support Tickets</h2>
                    <div class="flex gap-3">
                        <select id="ticketStatusFilter" class="px-4 py-2 border rounded-lg">
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                        <select id="ticketPriorityFilter" class="px-4 py-2 border rounded-lg">
                            <option value="all">All Priority</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <button onclick="loadTickets()" class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                            <i class="fas fa-sync-alt mr-2"></i>Refresh
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="ticketsList" class="bg-white divide-y divide-gray-200"></tbody>
                    </table>
                </div>
            </div>
            
            <!-- Ticket Detail Modal (hidden by default) -->
            <div id="ticketModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-2xl font-bold" id="ticketModalTitle">Ticket Details</h3>
                        <button onclick="closeTicketModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6">
                        <div id="ticketDetails"></div>
                        <div class="mt-6">
                            <h4 class="font-bold mb-3">Messages</h4>
                            <div id="ticketMessages" class="space-y-3 mb-4"></div>
                            <div class="border-t pt-4">
                                <textarea id="ticketReplyMessage" placeholder="Type your reply..." class="w-full px-4 py-2 border rounded-lg" rows="3"></textarea>
                                <div class="flex justify-end gap-2 mt-2">
                                    <button onclick="replyToTicket(false)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                        <i class="fas fa-reply mr-2"></i>Reply
                                    </button>
                                    <button onclick="replyToTicket(true)" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                                        <i class="fas fa-sticky-note mr-2"></i>Internal Note
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Live Chat Tab -->
        <div id="chatTab" class="tab-content hidden">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6" style="height: calc(100vh - 250px);">
                <!-- Chat Rooms List -->
                <div class="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                    <div class="p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        <h3 class="font-bold flex items-center">
                            <i class="fas fa-comments mr-2"></i>Chat Rooms
                        </h3>
                    </div>
                    <div class="flex-1 overflow-y-auto" id="chatRoomsList">
                        <!-- Chat rooms will be loaded here -->
                    </div>
                </div>
                
                <!-- Chat Messages -->
                <div class="md:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                    <div class="p-4 border-b bg-gray-50">
                        <div id="chatHeader" class="text-gray-500">Select a chat room to start conversation</div>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4" id="chatMessages" style="min-height: 400px;">
                        <!-- Messages will be loaded here -->
                    </div>
                    <div class="p-4 border-t">
                        <div class="flex gap-2">
                            <input type="text" id="chatMessageInput" placeholder="Type a message..." class="flex-1 px-4 py-2 border rounded-lg" disabled>
                            <button onclick="sendChatMessage()" id="sendChatBtn" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50" disabled>
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Hotels Tab -->
        <div id="hotelsTab" class="tab-content">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4">
                    <i class="fas fa-plus-circle mr-2 text-purple-600"></i>Add New Hotel
                </h2>
                <form id="addHotelForm" class="grid md:grid-cols-3 gap-4">
                    <input type="text" id="hotelName" placeholder="Hotel Name" required class="px-4 py-2 border rounded-lg">
                    <input type="email" id="hotelEmail" placeholder="Admin Email" required class="px-4 py-2 border rounded-lg">
                    <input type="text" id="hotelSlug" placeholder="URL Slug (e.g., paradise-resort)" required class="px-4 py-2 border rounded-lg">
                    <input type="text" id="hotelPhone" placeholder="Phone" class="px-4 py-2 border rounded-lg">
                    <input type="text" id="hotelLocation" placeholder="Location/City" class="px-4 py-2 border rounded-lg">
                    <button type="submit" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                        <i class="fas fa-check mr-2"></i>Add Hotel
                    </button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Hotels</h2>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left">Hotel Name</th>
                                <th class="px-4 py-3 text-left">Slug</th>
                                <th class="px-4 py-3 text-left">Admin Email</th>
                                <th class="px-4 py-3 text-left">Location</th>
                                <th class="px-4 py-3 text-left">Status</th>
                                <th class="px-4 py-3 text-left">Created</th>
                                <th class="px-4 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="hotelsList"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Vendors Tab -->
        <div id="vendorsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Vendors Across Platform</h2>
                <div id="vendorsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Bookings Tab -->
        <div id="bookingsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Recent Bookings</h2>
                <div id="bookingsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Analytics Tab -->
        <div id="analyticsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Platform Analytics</h2>
                <p class="text-gray-600">Analytics dashboard coming soon...</p>
            </div>
        </div>

        <!-- Settings Tab -->
        <div id="settingsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Platform Settings</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Platform Name</label>
                        <input type="text" value="GuestConnect" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Default Currency</label>
                        <select class="w-full px-4 py-2 border rounded-lg">
                            <option>USD</option>
                            <option>EUR</option>
                            <option>GBP</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Commission Rate (%)</label>
                        <input type="number" value="10" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <button class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                        <i class="fas fa-save mr-2"></i>Save Settings
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const user = JSON.parse(localStorage.getItem('superadmin_user') || '{}');
        if (!user.user_id || user.role !== 'superadmin') {
            window.location.href = '/superadmin/login';
        }

        let currentTab = 'hotels';

        function showTab(tab, clickedButton) {
            currentTab = tab;
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
            document.getElementById(tab + 'Tab').classList.remove('hidden');
            if (clickedButton) {
                clickedButton.classList.add('tab-active');
            }

            if (tab === 'hotels') loadHotels();
            if (tab === 'vendors') loadVendors();
            if (tab === 'bookings') loadBookings();
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.getAttribute('data-tab');
                showTab(tab, this);
            });
        });

        async function loadStats() {
            try {
                const response = await fetch('/api/superadmin/stats');
                const stats = await response.json();
                document.getElementById('totalHotels').textContent = stats.total_hotels || 0;
                document.getElementById('totalVendors').textContent = stats.total_vendors || 0;
                document.getElementById('totalBookings').textContent = stats.total_bookings || 0;
                document.getElementById('totalRevenue').textContent = '$' + (stats.total_revenue || 0).toLocaleString();
            } catch (error) {
                console.error('Load stats error:', error);
            }
        }

        async function loadHotels() {
            try {
                const response = await fetch('/api/superadmin/hotels');
                const hotels = await response.json();
                const list = document.getElementById('hotelsList');
                
                if (!hotels || hotels.length === 0) {
                    list.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No hotels yet</td></tr>';
                    return;
                }
                
                list.innerHTML = hotels.map(h => '<tr class="border-b hover:bg-gray-50"><td class="px-4 py-3 font-medium">' + h.property_name + '</td><td class="px-4 py-3"><code class="bg-gray-100 px-2 py-1 rounded text-sm">' + h.slug + '</code></td><td class="px-4 py-3">' + (h.contact_email || 'N/A') + '</td><td class="px-4 py-3">' + (h.location || 'N/A') + '</td><td class="px-4 py-3"><span class="px-2 py-1 rounded text-xs ' + (h.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800') + '">' + h.status + '</span></td><td class="px-4 py-3 text-sm text-gray-500">' + new Date(h.created_at).toLocaleDateString() + '</td><td class="px-4 py-3"><a href="/admin/dashboard?property_id=' + h.property_id + '" target="_blank" class="text-purple-600 hover:underline text-sm"><i class="fas fa-external-link-alt mr-1"></i>View Admin</a></td></tr>').join('');
            } catch (error) {
                console.error('Load hotels error:', error);
            }
        }

        async function loadVendors() {
            try {
                const response = await fetch('/api/superadmin/vendors');
                const vendors = await response.json();
                const list = document.getElementById('vendorsList');
                
                if (!vendors || vendors.length === 0) {
                    list.innerHTML = '<p class="text-gray-500 text-center py-8">No vendors yet</p>';
                    return;
                }
                
                list.innerHTML = vendors.map(v => '<div class="border rounded-lg p-4"><div class="flex justify-between items-start"><div><h3 class="font-bold">' + v.business_name + '</h3><p class="text-sm text-gray-600">' + v.email + ' • ' + v.phone + '</p><p class="text-xs text-gray-500 mt-1">Connected to: ' + (v.property_count || 0) + ' hotel(s)</p></div><span class="px-3 py-1 rounded-full text-sm ' + (v.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800') + '">' + v.status + '</span></div></div>').join('');
            } catch (error) {
                console.error('Load vendors error:', error);
            }
        }

        async function loadBookings() {
            try {
                const response = await fetch('/api/superadmin/bookings');
                const bookings = await response.json();
                const list = document.getElementById('bookingsList');
                
                if (!bookings || bookings.length === 0) {
                    list.innerHTML = '<p class="text-gray-500 text-center py-8">No bookings yet</p>';
                    return;
                }
                
                list.innerHTML = bookings.map(b => '<div class="border rounded-lg p-4"><div class="flex justify-between items-start"><div><h3 class="font-bold">' + b.activity_title + '</h3><p class="text-sm text-gray-600">Guest: ' + b.guest_name + ' (' + b.guest_email + ')</p><p class="text-sm text-gray-600">Hotel: ' + b.property_name + '</p><p class="text-xs text-gray-500 mt-1">' + new Date(b.booking_date).toLocaleString() + '</p></div><div class="text-right"><span class="text-lg font-bold text-blue-600">$' + (b.total_amount || 0) + '</span><br><span class="px-2 py-1 rounded text-xs ' + (b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') + '">' + b.payment_status + '</span></div></div></div>').join('');
            } catch (error) {
                console.error('Load bookings error:', error);
            }
        }

        document.getElementById('addHotelForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const hotelData = {
                property_name: document.getElementById('hotelName').value,
                slug: document.getElementById('hotelSlug').value,
                contact_email: document.getElementById('hotelEmail').value,
                contact_phone: document.getElementById('hotelPhone').value,
                location: document.getElementById('hotelLocation').value
            };

            try {
                const response = await fetch('/api/superadmin/hotels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(hotelData)
                });

                const result = await response.json();
                if (result.success) {
                    alert('Hotel added successfully! Admin credentials:' + String.fromCharCode(10) + 'Email: ' + hotelData.contact_email + String.fromCharCode(10) + 'Password: admin123' + String.fromCharCode(10) + String.fromCharCode(10) + 'Please ask the hotel to change their password.');
                    e.target.reset();
                    loadHotels();
                    loadStats();
                } else {
                    alert('Error: ' + (result.error || 'Failed to add hotel'));
                }
            } catch (error) {
                console.error('Add hotel error:', error);
                alert('Failed to add hotel');
            }
        });

        // ============================================
        // USER MANAGEMENT FUNCTIONS
        // ============================================
        let allUsers = [];
        
        async function loadUsers() {
            try {
                const userType = document.getElementById('userTypeFilter').value;
                const status = document.getElementById('userStatusFilter').value;
                
                const response = await fetch('/api/superadmin/users?type=' + userType + '&status=' + status);
                const data = await response.json();
                allUsers = data.users || [];
                displayUsers(allUsers);
            } catch (error) {
                console.error('Load users error:', error);
            }
        }
        
        function displayUsers(users) {
            const html = users.map(user => {
                const statusColors = {
                    active: 'bg-green-100 text-green-800',
                    suspended: 'bg-red-100 text-red-800',
                    inactive: 'bg-gray-100 text-gray-800',
                    pending: 'bg-yellow-100 text-yellow-800'
                };
                const typeIcons = {
                    hotel: 'fa-hotel',
                    vendor: 'fa-store',
                    superadmin: 'fa-crown'
                };
                
                return '<tr>' +
                    '<td class="px-6 py-4">' +
                        '<div class="font-medium">' + user.name + '</div>' +
                        '<div class="text-sm text-gray-500">' + user.email + '</div>' +
                    '</td>' +
                    '<td class="px-6 py-4">' +
                        '<i class="fas ' + typeIcons[user.user_type] + ' mr-2"></i>' +
                        user.user_type.toUpperCase() +
                    '</td>' +
                    '<td class="px-6 py-4 text-sm">' +
                        (user.property_name || user.vendor_business_name || 'N/A') +
                    '</td>' +
                    '<td class="px-6 py-4">' +
                        '<span class="px-2 py-1 text-xs rounded-full ' + statusColors[user.status] + '">' +
                            user.status.toUpperCase() +
                        '</span>' +
                    '</td>' +
                    '<td class="px-6 py-4 text-sm">' +
                        (user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never') +
                    '</td>' +
                    '<td class="px-6 py-4">' +
                        '<div class="flex gap-2">' +
                            (user.status === 'active' ?
                                '<button onclick="suspendUser(' + user.user_id + ')" class="text-red-600 hover:text-red-800">' +
                                    '<i class="fas fa-ban"></i>' +
                                '</button>' :
                                '<button onclick="activateUser(' + user.user_id + ')" class="text-green-600 hover:text-green-800">' +
                                    '<i class="fas fa-check-circle"></i>' +
                                '</button>') +
                            '<button onclick="deleteUser(' + user.user_id + ')" class="text-red-600 hover:text-red-800">' +
                                '<i class="fas fa-trash"></i>' +
                            '</button>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
            }).join('');
            
            document.getElementById('usersList').innerHTML = html || '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No users found</td></tr>';
        }
        
        async function suspendUser(userId) {
            const reason = prompt('Reason for suspension:');
            if (!reason) return;
            
            try {
                const response = await fetch('/api/superadmin/users/' + userId + '/status', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'suspended', reason })
                });
                
                if (response.ok) {
                    alert('User suspended successfully');
                    loadUsers();
                }
            } catch (error) {
                console.error('Suspend user error:', error);
                alert('Failed to suspend user');
            }
        }
        
        async function activateUser(userId) {
            try {
                const response = await fetch('/api/superadmin/users/' + userId + '/status', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' })
                });
                
                if (response.ok) {
                    alert('User activated successfully');
                    loadUsers();
                }
            } catch (error) {
                console.error('Activate user error:', error);
                alert('Failed to activate user');
            }
        }
        
        async function deleteUser(userId) {
            if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
            
            try {
                const response = await fetch('/api/superadmin/users/' + userId, { method: 'DELETE' });
                if (response.ok) {
                    alert('User deleted successfully');
                    loadUsers();
                }
            } catch (error) {
                console.error('Delete user error:', error);
                alert('Failed to delete user');
            }
        }
        
        // ============================================
        // SUPPORT TICKET FUNCTIONS
        // ============================================
        let allTickets = [];
        let currentTicketId = null;
        
        async function loadTickets() {
            try {
                const status = document.getElementById('ticketStatusFilter').value;
                const priority = document.getElementById('ticketPriorityFilter').value;
                
                const response = await fetch('/api/superadmin/tickets?status=' + status + '&priority=' + priority);
                const data = await response.json();
                allTickets = data.tickets || [];
                displayTickets(allTickets);
            } catch (error) {
                console.error('Load tickets error:', error);
            }
        }
        
        function displayTickets(tickets) {
            const priorityColors = {
                urgent: 'bg-red-100 text-red-800',
                high: 'bg-orange-100 text-orange-800',
                medium: 'bg-yellow-100 text-yellow-800',
                low: 'bg-green-100 text-green-800'
            };
            const statusColors = {
                open: 'bg-blue-100 text-blue-800',
                in_progress: 'bg-purple-100 text-purple-800',
                resolved: 'bg-green-100 text-green-800',
                closed: 'bg-gray-100 text-gray-800'
            };
            
            const html = tickets.map(ticket => {
                return '<tr class="hover:bg-gray-50 cursor-pointer" onclick="viewTicket(' + ticket.ticket_id + ')">' +
                    '<td class="px-6 py-4 font-medium">' + ticket.ticket_number + '</td>' +
                    '<td class="px-6 py-4">' + ticket.subject + '</td>' +
                    '<td class="px-6 py-4">' +
                        '<div>' + ticket.created_by_name + '</div>' +
                        '<div class="text-xs text-gray-500">' + ticket.created_by_type + '</div>' +
                    '</td>' +
                    '<td class="px-6 py-4">' +
                        '<span class="px-2 py-1 text-xs rounded-full ' + priorityColors[ticket.priority] + '">' +
                            ticket.priority.toUpperCase() +
                        '</span>' +
                    '</td>' +
                    '<td class="px-6 py-4">' +
                        '<span class="px-2 py-1 text-xs rounded-full ' + statusColors[ticket.status] + '">' +
                            ticket.status.replace('_', ' ').toUpperCase() +
                        '</span>' +
                    '</td>' +
                    '<td class="px-6 py-4 text-sm">' +
                        new Date(ticket.created_at).toLocaleDateString() +
                    '</td>' +
                    '<td class="px-6 py-4">' +
                        '<button onclick="event.stopPropagation(); viewTicket(' + ticket.ticket_id + ')" class="text-blue-600 hover:text-blue-800">' +
                            '<i class="fas fa-eye"></i>' +
                        '</button>' +
                    '</td>' +
                '</tr>';
            }).join('');
            
            document.getElementById('ticketsList').innerHTML = html || '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No tickets found</td></tr>';
        }
        
        async function viewTicket(ticketId) {
            currentTicketId = ticketId;
            const ticket = allTickets.find(t => t.ticket_id === ticketId);
            if (!ticket) return;
            
            document.getElementById('ticketModalTitle').textContent = 'Ticket #' + ticket.ticket_number;
            
            const detailsHtml = '<div class="space-y-4">' +
                '<div><strong>Subject:</strong> ' + ticket.subject + '</div>' +
                '<div><strong>Description:</strong><br>' + ticket.description + '</div>' +
                '<div><strong>From:</strong> ' + ticket.created_by_name + ' (' + ticket.created_by_email + ')</div>' +
                '<div><strong>Priority:</strong> ' + ticket.priority.toUpperCase() + '</div>' +
                '<div><strong>Status:</strong> ' + ticket.status.toUpperCase() + '</div>' +
                '<div><strong>Created:</strong> ' + new Date(ticket.created_at).toLocaleString() + '</div>' +
                '<div>' +
                    '<select id="ticketStatusUpdate" class="px-4 py-2 border rounded-lg">' +
                        '<option value="open" ' + (ticket.status === 'open' ? 'selected' : '') + '>Open</option>' +
                        '<option value="in_progress" ' + (ticket.status === 'in_progress' ? 'selected' : '') + '>In Progress</option>' +
                        '<option value="resolved" ' + (ticket.status === 'resolved' ? 'selected' : '') + '>Resolved</option>' +
                        '<option value="closed" ' + (ticket.status === 'closed' ? 'selected' : '') + '>Closed</option>' +
                    '</select>' +
                    '<button onclick="updateTicketStatus()" class="ml-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">' +
                        'Update Status' +
                    '</button>' +
                '</div>' +
            '</div>';
            
            document.getElementById('ticketDetails').innerHTML = detailsHtml;
            
            // Load messages
            try {
                const response = await fetch('/api/tickets/' + ticketId + '/messages');
                const data = await response.json();
                const messages = data.messages || [];
                
                const messagesHtml = messages.map(msg => {
                    return '<div class="border-l-4 ' + (msg.is_internal_note ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50') + ' p-3 rounded">' +
                        '<div class="flex justify-between mb-1">' +
                            '<strong>' + msg.author_name + '</strong>' +
                            '<span class="text-xs text-gray-500">' + new Date(msg.created_at).toLocaleString() + '</span>' +
                        '</div>' +
                        (msg.is_internal_note ? '<div class="text-xs text-yellow-700 mb-1">Internal Note</div>' : '') +
                        '<div>' + msg.message + '</div>' +
                    '</div>';
                }).join('');
                
                document.getElementById('ticketMessages').innerHTML = messagesHtml || '<p class="text-gray-500">No messages yet</p>';
            } catch (error) {
                console.error('Load messages error:', error);
            }
            
            document.getElementById('ticketModal').classList.remove('hidden');
        }
        
        function closeTicketModal() {
            document.getElementById('ticketModal').classList.add('hidden');
            currentTicketId = null;
        }
        
        async function updateTicketStatus() {
            const newStatus = document.getElementById('ticketStatusUpdate').value;
            
            try {
                const response = await fetch('/api/superadmin/tickets/' + currentTicketId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus, assigned_to_id: 1, assigned_to_name: 'Super Admin' })
                });
                
                if (response.ok) {
                    alert('Ticket status updated');
                    loadTickets();
                    closeTicketModal();
                }
            } catch (error) {
                console.error('Update ticket error:', error);
                alert('Failed to update ticket');
            }
        }
        
        async function replyToTicket(isInternal) {
            const message = document.getElementById('ticketReplyMessage').value.trim();
            if (!message) return;
            
            try {
                const response = await fetch('/api/tickets/' + currentTicketId + '/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message,
                        is_internal_note: isInternal,
                        author_type: 'superadmin',
                        author_id: 1,
                        author_name: 'Super Admin'
                    })
                });
                
                if (response.ok) {
                    document.getElementById('ticketReplyMessage').value = '';
                    viewTicket(currentTicketId); // Reload to show new message
                }
            } catch (error) {
                console.error('Reply error:', error);
                alert('Failed to send reply');
            }
        }
        
        // ============================================
        // LIVE CHAT FUNCTIONS
        // ============================================
        let chatRooms = [];
        let currentRoomId = null;
        let chatRefreshInterval = null;
        
        async function loadChatRooms() {
            try {
                const response = await fetch('/api/superadmin/chat/rooms?status=active');
                const data = await response.json();
                chatRooms = data.rooms || [];
                displayChatRooms(chatRooms);
            } catch (error) {
                console.error('Load chat rooms error:', error);
            }
        }
        
        function displayChatRooms(rooms) {
            const html = rooms.map(room => {
                return '<div onclick="selectChatRoom(' + room.room_id + ')" class="p-4 border-b hover:bg-gray-50 cursor-pointer ' + (currentRoomId === room.room_id ? 'bg-blue-50' : '') + '">' +
                    '<div class="font-medium">' + room.room_name + '</div>' +
                    '<div class="text-sm text-gray-500">' + room.participant1_name + '</div>' +
                    '<div class="text-xs text-gray-400">' +
                        (room.last_message_at ? new Date(room.last_message_at).toLocaleString() : 'No messages') +
                    '</div>' +
                '</div>';
            }).join('');
            
            document.getElementById('chatRoomsList').innerHTML = html || '<div class="p-4 text-gray-500 text-center">No active chats</div>';
        }
        
        async function selectChatRoom(roomId) {
            currentRoomId = roomId;
            const room = chatRooms.find(r => r.room_id === roomId);
            if (!room) return;
            
            document.getElementById('chatHeader').innerHTML = '<div class="font-bold">' + room.room_name + '</div>' +
                '<div class="text-sm text-gray-500">' + room.participant1_name + '</div>';
            
            document.getElementById('chatMessageInput').disabled = false;
            document.getElementById('sendChatBtn').disabled = false;
            
            loadChatMessages(roomId);
            displayChatRooms(chatRooms); // Refresh to show selected state
            
            // Auto-refresh messages every 3 seconds
            if (chatRefreshInterval) clearInterval(chatRefreshInterval);
            chatRefreshInterval = setInterval(() => loadChatMessages(roomId), 3000);
        }
        
        async function loadChatMessages(roomId) {
            try {
                const response = await fetch('/api/chat/rooms/' + roomId + '/messages?limit=100');
                const data = await response.json();
                const messages = data.messages || [];
                
                const html = messages.map(msg => {
                    const isSuperAdmin = msg.sender_type === 'superadmin';
                    return '<div class="flex ' + (isSuperAdmin ? 'justify-end' : 'justify-start') + ' mb-3">' +
                        '<div class="max-w-[70%] ' + (isSuperAdmin ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800') + ' px-4 py-2 rounded-lg">' +
                            '<div class="text-xs mb-1 ' + (isSuperAdmin ? 'text-purple-200' : 'text-gray-500') + '">' +
                                msg.sender_name + ' · ' + new Date(msg.created_at).toLocaleTimeString() +
                            '</div>' +
                            '<div>' + msg.message + '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
                
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.innerHTML = html || '<div class="text-center text-gray-500">No messages yet. Start the conversation!</div>';
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } catch (error) {
                console.error('Load messages error:', error);
            }
        }
        
        async function sendChatMessage() {
            const input = document.getElementById('chatMessageInput');
            const message = input.value.trim();
            if (!message || !currentRoomId) return;
            
            try {
                const response = await fetch('/api/chat/rooms/' + currentRoomId + '/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message,
                        sender_type: 'superadmin',
                        sender_id: 1,
                        sender_name: 'Super Admin'
                    })
                });
                
                if (response.ok) {
                    input.value = '';
                    loadChatMessages(currentRoomId);
                }
            } catch (error) {
                console.error('Send message error:', error);
                alert('Failed to send message');
            }
        }
        
        // Allow Enter key to send messages
        document.addEventListener('DOMContentLoaded', () => {
            const input = document.getElementById('chatMessageInput');
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                    }
                });
            }
        });
        
        // ============================================
        // TAB SWITCHING
        // ============================================
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                
                // Update active button
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
                btn.classList.add('tab-active');
                
                // Show/hide content
                document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
                document.getElementById(tab + 'Tab').classList.remove('hidden');
                
                // Load data for the selected tab
                if (tab === 'users') loadUsers();
                else if (tab === 'support') loadTickets();
                else if (tab === 'chat') loadChatRooms();
                else if (tab === 'hotels') loadHotels();
                else if (tab === 'vendors') loadVendors();
                else if (tab === 'bookings') loadBookings();
            });
        });
        
        // Event listeners for filters
        document.getElementById('userTypeFilter').addEventListener('change', loadUsers);
        document.getElementById('userStatusFilter').addEventListener('change', loadUsers);
        document.getElementById('ticketStatusFilter').addEventListener('change', loadTickets);
        document.getElementById('ticketPriorityFilter').addEventListener('change', loadTickets);

        function logout() {
            localStorage.removeItem('superadmin_user');
            window.location.href = '/superadmin/login';
        }

        loadStats();
        loadHotels();
    </script>
</body>
</html>
  `)
})

// ============================================
// HOTEL ADMIN (existing)
// ============================================

app.get('/admin/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login - Paradise Resort</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-900">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
                <div class="text-center mb-6">
                    <i class="fas fa-shield-alt text-4xl text-blue-600 mb-2"></i>
                    <h1 class="text-2xl font-bold">Admin Portal</h1>
                </div>
                <form id="adminLoginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Email</label>
                        <input type="email" id="adminEmail" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Password</label>
                        <input type="password" id="adminPassword" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">
                        <i class="fas fa-lock mr-2"></i>Secure Login
                    </button>
                </form>
            </div>
        </div>
        <script>
          document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            
            try {
              const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              
              const data = await response.json();
              
              if (data.success) {
                localStorage.setItem('admin_user', JSON.stringify(data.user));
                localStorage.setItem('admin_token', data.token || data.user.user_id);
                window.location.href = '/admin/dashboard';
              } else {
                alert('Login failed: ' + (data.error || 'Invalid credentials'));
              }
            } catch (error) {
              console.error('Login error:', error);
              alert('Login failed. Please try again.');
            }
          });
        </script>
    </body>
    </html>
  `)
})

// Vendor Dashboard page
app.get('/vendor/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50 transition-colors duration-300">
    <style>
      /* Dark mode styles for vendor dashboard */
      .dark { color-scheme: dark; }
      .dark body { background-color: #1a202c !important; color: #e2e8f0 !important; }
      .dark .bg-white { background-color: #2d3748 !important; }
      .dark .bg-gray-50 { background-color: #1a202c !important; }
      .dark .bg-gray-100 { background-color: #2d3748 !important; }
      .dark .bg-gray-200 { background-color: #4a5568 !important; }
      .dark .text-gray-700 { color: #cbd5e0 !important; }
      .dark .text-gray-600 { color: #a0aec0 !important; }
      .dark .text-gray-800 { color: #e2e8f0 !important; }
      .dark .text-gray-900 { color: #f7fafc !important; }
      .dark .border { border-color: #4a5568 !important; }
      .dark .border-gray-200 { border-color: #4a5568 !important; }
      .dark .border-gray-300 { border-color: #4a5568 !important; }
      .dark input, .dark select, .dark textarea { background-color: #2d3748 !important; border-color: #4a5568 !important; color: #e2e8f0 !important; }
      .dark input::placeholder, .dark textarea::placeholder { color: #718096 !important; }
      .dark .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2) !important; }
      .dark .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2) !important; }
      .dark .bg-gradient-to-r { opacity: 0.95; }
      * { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease; }
    </style>
    <div class="bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-4 shadow-lg transition-colors duration-300">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div><h1 class="text-2xl font-bold">Vendor Portal</h1></div>
            <div class="flex items-center gap-3">
                <button onclick="toggleDarkMode()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors" title="Toggle Dark Mode">
                  <i id="darkModeIcon" class="fas fa-moon mr-2"></i><span id="darkModeText">Dark Mode</span>
                </button>
                <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg"><i class="fas fa-sign-out-alt mr-2"></i>Logout</button>
            </div>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-start">
                    <div><p class="text-gray-600 text-sm">Today's Bookings</p><p class="text-3xl font-bold" id="todayBookings">0</p></div>
                    <div class="bg-blue-100 p-3 rounded-lg"><i class="fas fa-calendar-day text-blue-600 text-xl"></i></div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-start">
                    <div><p class="text-gray-600 text-sm">Total Bookings</p><p class="text-3xl font-bold" id="totalBookings">0</p></div>
                    <div class="bg-green-100 p-3 rounded-lg"><i class="fas fa-list text-green-600 text-xl"></i></div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-start">
                    <div><p class="text-gray-600 text-sm">Pending Confirmations</p><p class="text-3xl font-bold" id="pendingBookings">0</p></div>
                    <div class="bg-yellow-100 p-3 rounded-lg"><i class="fas fa-clock text-yellow-600 text-xl"></i></div>
                </div>
            </div>
        </div>

        <!-- Connected Hotels/Properties -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-hotel mr-2 text-indigo-600"></i>Connected Hotels & Resorts</h2>
            <p class="text-gray-600 text-sm mb-4">You are currently connected to the following properties. Guests at these hotels can discover and book your activities.</p>
            <div id="propertiesList" class="space-y-3">
                <div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>
            </div>
        </div>

        <!-- Bookings History -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-history mr-2 text-purple-600"></i>Booking History</h2>
            <div id="bookingsList" class="space-y-3"></div>
        </div>

        <!-- Callback Requests -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-phone-alt mr-2 text-orange-600"></i>Callback Requests</h2>
            <p class="text-gray-600 mb-4">Guests who requested callbacks for your activities</p>
            <div id="callbacksList" class="space-y-3"></div>
        </div>

        <!-- Vendor Profile -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-user-circle mr-2 text-indigo-600"></i>My Profile</h2>
            <form id="profileForm" class="space-y-4">
                <div class="flex items-center gap-6 mb-6">
                    <div class="relative">
                        <img id="profileImagePreview" src="https://via.placeholder.com/150" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-gray-200">
                        <label for="profileImageInput" class="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                            <i class="fas fa-camera"></i>
                            <input type="file" id="profileImageInput" accept="image/*" class="hidden">
                        </label>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold" id="profileBusinessName">Business Name</h3>
                        <p class="text-gray-600" id="profileEmail">email@example.com</p>
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-2">Business Name</label><input type="text" id="businessNameInput" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Phone</label><input type="tel" id="phoneInput" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Website</label><input type="url" id="websiteInput" placeholder="https://" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Years of Experience</label><input type="number" id="yearsExpInput" min="0" class="w-full px-4 py-2 border rounded-lg"></div>
                </div>
                
                <div><label class="block text-sm font-medium mb-2">Description</label><textarea id="descriptionInput" rows="4" placeholder="Tell guests about your business..." class="w-full px-4 py-2 border rounded-lg"></textarea></div>
                
                <div class="grid md:grid-cols-3 gap-4">
                    <div><label class="block text-sm font-medium mb-2">Address</label><input type="text" id="addressInput" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">City</label><input type="text" id="cityInput" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Country</label><input type="text" id="countryInput" class="w-full px-4 py-2 border rounded-lg"></div>
                </div>
                
                <div><label class="block text-sm font-medium mb-2">Specialties (comma-separated)</label><input type="text" id="specialtiesInput" placeholder="Diving, Snorkeling, PADI Certified" class="w-full px-4 py-2 border rounded-lg"></div>
                
                <div><label class="block text-sm font-medium mb-2">Languages Spoken (comma-separated)</label><input type="text" id="languagesInput" placeholder="English, Arabic, French" class="w-full px-4 py-2 border rounded-lg"></div>
                
                <button type="submit" class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"><i class="fas fa-save mr-2"></i>Update Profile</button>
            </form>
        </div>

        <!-- Add Activity Form -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-plus-circle mr-2 text-blue-600"></i>Add New Activity</h2>
            <form id="addActivityForm" class="space-y-4">
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-2">Activity Title</label><input type="text" id="title" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Category</label><select id="category" required class="w-full px-4 py-2 border rounded-lg"><option value="">Select category...</option></select></div>
                    <div><label class="block text-sm font-medium mb-2">Price (USD)</label><input type="number" id="price" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Duration (minutes)</label><input type="number" id="duration" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Capacity per Slot</label><input type="number" id="capacity" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><label class="block text-sm font-medium mb-2">Activity Image URL</label><input type="url" id="activityImageUrl" placeholder="https://images.unsplash.com/photo-example.jpg" class="w-full px-4 py-2 border rounded-lg"><p class="text-xs text-gray-500 mt-1">Provide a direct link to activity image (e.g., from Unsplash, Imgur)</p></div>
                    <div><label class="block text-sm font-medium mb-2">Video URL</label><input type="url" id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." class="w-full px-4 py-2 border rounded-lg"><p class="text-xs text-gray-500 mt-1">YouTube or direct video link (optional)</p></div>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-medium">Short Description</label>
                        <button type="button" onclick="proofreadText('shortDesc', 'vendor')" class="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition flex items-center gap-1">
                            <i class="fas fa-magic"></i> AI Proofread
                        </button>
                    </div>
                    <textarea id="shortDesc" rows="2" required class="w-full px-4 py-2 border rounded-lg"></textarea>
                    <p class="text-xs text-gray-500 mt-1">✨ Use AI Proofread to improve grammar and clarity (10 free per day)</p>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-medium">Full Description</label>
                        <button type="button" onclick="proofreadText('fullDesc', 'vendor')" class="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition flex items-center gap-1">
                            <i class="fas fa-magic"></i> AI Proofread
                        </button>
                    </div>
                    <textarea id="fullDesc" rows="4" required class="w-full px-4 py-2 border rounded-lg"></textarea>
                    <p class="text-xs text-gray-500 mt-1">✨ Use AI Proofread to improve grammar and clarity (10 free per day)</p>
                </div>
                
                <!-- Requirements Section -->
                <div class="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <label class="block text-sm font-bold mb-3 text-gray-700">
                    <i class="fas fa-info-circle mr-2 text-blue-600"></i>Requirements
                  </label>
                  <div id="requirementsList" class="space-y-2 mb-3"></div>
                  <div class="flex gap-2">
                    <input type="text" id="requirementInput" placeholder="e.g., Minimum age: 12 years" class="flex-1 px-3 py-2 border rounded-lg text-sm">
                    <button type="button" onclick="addRequirement()" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">
                      <i class="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>

                <!-- What's Included Section -->
                <div class="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <label class="block text-sm font-bold mb-3 text-green-700">
                    <i class="fas fa-check-circle mr-2 text-green-600"></i>What's Included
                  </label>
                  <div id="includesList" class="space-y-2 mb-3"></div>
                  <div class="flex gap-2">
                    <input type="text" id="includeInput" placeholder="e.g., Professional guide, Equipment" class="flex-1 px-3 py-2 border rounded-lg text-sm">
                    <button type="button" onclick="addInclude()" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm">
                      <i class="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>

                <!-- What's NOT Included Section -->
                <div class="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                  <label class="block text-sm font-bold mb-3 text-red-700">
                    <i class="fas fa-times-circle mr-2 text-red-600"></i>What's NOT Included
                  </label>
                  <div id="excludesList" class="space-y-2 mb-3"></div>
                  <div class="flex gap-2">
                    <input type="text" id="excludeInput" placeholder="e.g., Dive session, Personal expenses" class="flex-1 px-3 py-2 border rounded-lg text-sm">
                    <button type="button" onclick="addExclude()" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm">
                      <i class="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>

                <button type="submit" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold w-full"><i class="fas fa-save mr-2"></i><span id="submitBtnText">Create Activity</span></button>
            </form>
        </div>

        <!-- Activities List -->
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4"><i class="fas fa-list mr-2 text-green-600"></i>My Activities</h2>
            <div id="activitiesList" class="space-y-4"></div>
        </div>
    </div>

    <script>
      const vendorId = localStorage.getItem('vendor_id');
      if (!vendorId) { window.location.href = '/vendor/login'; }

      // Dark mode toggle
      function toggleDarkMode() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        
        if (isDark) {
          html.classList.remove('dark');
          localStorage.setItem('vendorDarkMode', 'false');
          document.getElementById('darkModeIcon').className = 'fas fa-moon mr-2';
          document.getElementById('darkModeText').textContent = 'Dark Mode';
        } else {
          html.classList.add('dark');
          localStorage.setItem('vendorDarkMode', 'true');
          document.getElementById('darkModeIcon').className = 'fas fa-sun mr-2';
          document.getElementById('darkModeText').textContent = 'Light Mode';
        }
      }
      
      // Initialize dark mode from localStorage
      (function initDarkMode() {
        const darkMode = localStorage.getItem('vendorDarkMode');
        if (darkMode === 'true') {
          document.documentElement.classList.add('dark');
          document.getElementById('darkModeIcon').className = 'fas fa-sun mr-2';
          document.getElementById('darkModeText').textContent = 'Light Mode';
        }
      })();

      async function loadDashboard() {
        try {
          const [bookingsRes, activitiesRes, categoriesRes, profileRes, propertiesRes, callbacksRes] = await Promise.all([
            fetch('/api/vendor/bookings', { headers: { 'X-Vendor-ID': vendorId } }),
            fetch('/api/vendor/activities', { headers: { 'X-Vendor-ID': vendorId } }),
            fetch('/api/categories'),
            fetch('/api/vendor/profile', { headers: { 'X-Vendor-ID': vendorId } }),
            fetch('/api/vendor/properties', { headers: { 'X-Vendor-ID': vendorId } }),
            fetch('/api/vendor/callbacks', { headers: { 'X-Vendor-ID': vendorId } })
          ]);

          // Check if all responses are OK
          if (!bookingsRes.ok) {
            console.error('Bookings fetch failed:', bookingsRes.status, await bookingsRes.text());
          }
          if (!activitiesRes.ok) {
            console.error('Activities fetch failed:', activitiesRes.status, await activitiesRes.text());
          }
          if (!categoriesRes.ok) {
            console.error('Categories fetch failed:', categoriesRes.status, await categoriesRes.text());
          }
          if (!profileRes.ok) {
            console.error('Profile fetch failed:', profileRes.status, await profileRes.text());
          }
          if (!propertiesRes.ok) {
            console.error('Properties fetch failed:', propertiesRes.status, await propertiesRes.text());
          }

          const bookings = bookingsRes.ok ? await bookingsRes.json() : { bookings: [] };
          const activities = activitiesRes.ok ? await activitiesRes.json() : { activities: [] };
          const categories = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
          const profile = profileRes.ok ? await profileRes.json() : { profile: null };
          const properties = propertiesRes.ok ? await propertiesRes.json() : { properties: [] };

          console.log('Dashboard data loaded:', {
            bookings: bookings.bookings?.length || 0,
            activities: activities.activities?.length || 0,
            categories: categories.categories?.length || 0,
            properties: properties.properties?.length || 0,
            profile: profile.profile ? 'loaded' : 'missing'
          });

          const today = new Date().toISOString().split('T')[0];
          const bookingsList = bookings.bookings || [];
          const todayBookings = bookingsList.filter(b => b.activity_date === today);
          document.getElementById('todayBookings').textContent = todayBookings.length;
          document.getElementById('totalBookings').textContent = bookingsList.length;
          document.getElementById('pendingBookings').textContent = bookingsList.filter(b => b.status === 'pending').length;

          const categorySelect = document.getElementById('category');
          const categoriesList = categories.categories || [];
          console.log('Populating categories dropdown:', categoriesList);
          categoriesList.forEach(cat => {
            categorySelect.innerHTML += '<option value="' + cat.category_id + '">' + cat.name + '</option>';
          });
          console.log('Category dropdown HTML:', categorySelect.innerHTML);

          const callbacks = await callbacksRes.json();
          
          displayProperties(properties.properties || []);
          displayBookings(bookingsList);
          displayCallbacks(callbacks || []);
          displayActivities(activities.activities || []);
          console.log('Activities displayed:', activities.activities?.length || 0);
          displayProfile(profile.profile);
        } catch (error) {
          console.error('Dashboard load error:', error);
          alert('Failed to load dashboard. Please try refreshing the page.');
        }
      }

      // Arrays to store requirements, includes, excludes
      let requirementsArray = [];
      let includesArray = [];
      let excludesArray = [];
      let currentEditId = null;

      // Helper function to render a list item with remove button
      function renderListItem(text, index, type) {
        const colors = {
          requirement: { bg: 'bg-blue-100', text: 'text-blue-800', btn: 'text-red-600 hover:text-red-800' },
          include: { bg: 'bg-green-100', text: 'text-green-800', btn: 'text-red-600 hover:text-red-800' },
          exclude: { bg: 'bg-red-100', text: 'text-red-800', btn: 'text-gray-600 hover:text-gray-800' }
        };
        const color = colors[type];
        const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return '<div class="flex items-center justify-between ' + color.bg + ' px-3 py-2 rounded-lg">' +
          '<span class="' + color.text + ' text-sm">' + escapedText + '</span>' +
          '<button type="button" onclick="removeItem(' + index + ', &quot;' + type + '&quot;)" class="' + color.btn + '">' +
          '<i class="fas fa-times"></i>' +
          '</button>' +
          '</div>';
      }

      // Add requirement
      window.addRequirement = function() {
        const input = document.getElementById('requirementInput');
        const value = input.value.trim();
        if (value) {
          requirementsArray.push(value);
          input.value = '';
          updateRequirementsList();
        }
      }

      // Add include
      window.addInclude = function() {
        const input = document.getElementById('includeInput');
        const value = input.value.trim();
        if (value) {
          includesArray.push(value);
          input.value = '';
          updateIncludesList();
        }
      }

      // Add exclude
      window.addExclude = function() {
        const input = document.getElementById('excludeInput');
        const value = input.value.trim();
        if (value) {
          excludesArray.push(value);
          input.value = '';
          updateExcludesList();
        }
      }

      // Remove item from array
      window.removeItem = function(index, type) {
        if (type === 'requirement') {
          requirementsArray.splice(index, 1);
          updateRequirementsList();
        } else if (type === 'include') {
          includesArray.splice(index, 1);
          updateIncludesList();
        } else if (type === 'exclude') {
          excludesArray.splice(index, 1);
          updateExcludesList();
        }
      }

      // Update display lists
      function updateRequirementsList() {
        const container = document.getElementById('requirementsList');
        container.innerHTML = requirementsArray.map((item, i) => 
          renderListItem(item, i, 'requirement')
        ).join('');
      }

      function updateIncludesList() {
        const container = document.getElementById('includesList');
        container.innerHTML = includesArray.map((item, i) => 
          renderListItem(item, i, 'include')
        ).join('');
      }

      function updateExcludesList() {
        const container = document.getElementById('excludesList');
        container.innerHTML = excludesArray.map((item, i) => 
          renderListItem(item, i, 'exclude')
        ).join('');
      }

      // Clear all arrays (for resetting form)
      function clearAllArrays() {
        requirementsArray = [];
        includesArray = [];
        excludesArray = [];
        updateRequirementsList();
        updateIncludesList();
        updateExcludesList();
      }

      function displayProfile(profile) {
        if (!profile) {
          console.error('Profile data is missing');
          return;
        }
        
        document.getElementById('profileBusinessName').textContent = profile.business_name || 'N/A';
        document.getElementById('profileEmail').textContent = profile.email || 'N/A';
        document.getElementById('businessNameInput').value = profile.business_name || '';
        document.getElementById('phoneInput').value = profile.phone || '';
        document.getElementById('websiteInput').value = profile.website || '';
        document.getElementById('descriptionInput').value = profile.description || '';
        document.getElementById('addressInput').value = profile.address || '';
        document.getElementById('cityInput').value = profile.city || '';
        document.getElementById('countryInput').value = profile.country || '';
        document.getElementById('yearsExpInput').value = profile.years_experience || '';
        
        try {
          const specialties = profile.specialties ? JSON.parse(profile.specialties) : [];
          document.getElementById('specialtiesInput').value = specialties.join(', ');
        } catch (e) {
          console.error('Failed to parse specialties:', e);
          document.getElementById('specialtiesInput').value = '';
        }
        
        try {
          const languages = profile.languages_spoken ? JSON.parse(profile.languages_spoken) : [];
          document.getElementById('languagesInput').value = languages.join(', ');
        } catch (e) {
          console.error('Failed to parse languages:', e);
          document.getElementById('languagesInput').value = '';
        }
        
        if (profile.profile_image) {
          document.getElementById('profileImagePreview').src = profile.profile_image;
        }
      }

      function displayProperties(properties) {
        const list = document.getElementById('propertiesList');
        
        if (!properties || properties.length === 0) {
          list.innerHTML = '<div class="text-center py-8 text-gray-500">' +
            '<i class="fas fa-info-circle text-3xl mb-3"></i>' +
            '<p class="font-semibold">Not connected to any hotels yet</p>' +
            '<p class="text-sm mt-2">Contact hotel administration to get connected and start receiving bookings.</p>' +
            '</div>';
          return;
        }
        
        list.innerHTML = properties.map(prop => {
          const statusClass = prop.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
          const featuredBadge = prop.is_featured ? '<span class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"><i class="fas fa-star mr-1"></i>Featured</span>' : '';
          const commissionRate = prop.custom_commission_rate || '15';
          
          return '<div class="border border-indigo-200 rounded-lg p-4 bg-indigo-50 hover:shadow-md transition">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1">' +
            '<h3 class="text-lg font-bold text-indigo-900">' + (prop.property_name || 'Unknown Property') + featuredBadge + '</h3>' +
            '<div class="mt-2 space-y-1 text-sm text-gray-700">' +
            '<p><i class="fas fa-map-marker-alt mr-2 text-indigo-600 w-4"></i>' + (prop.property_address || 'Address not available') + '</p>' +
            '<p><i class="fas fa-envelope mr-2 text-indigo-600 w-4"></i>' + (prop.property_email || 'N/A') + '</p>' +
            '<p><i class="fas fa-phone mr-2 text-indigo-600 w-4"></i>' + (prop.property_phone || 'N/A') + '</p>' +
            '<p><i class="fas fa-percentage mr-2 text-indigo-600 w-4"></i>Commission Rate: <strong>' + commissionRate + '%</strong></p>' +
            '<p><i class="fas fa-user-plus mr-2 text-indigo-600 w-4"></i>Joined via: <span class="capitalize">' + (prop.joined_via || 'admin') + '</span></p>' +
            '</div>' +
            '</div>' +
            '<div class="flex flex-col items-end gap-2">' +
            '<span class="px-3 py-1 rounded-full text-xs font-semibold ' + statusClass + '">' + (prop.status || 'pending') + '</span>' +
            '<a href="/hotel/' + (prop.property_slug || '') + '" target="_blank" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">' +
            '<i class="fas fa-external-link-alt mr-1"></i>View Hotel Page' +
            '</a>' +
            '</div>' +
            '</div>' +
            '</div>';
        }).join('');
      }

      function displayBookings(bookings) {
        const list = document.getElementById('bookingsList');
        if (bookings.length === 0) {
          list.innerHTML = '<p class="text-gray-500 text-center py-4">No bookings yet</p>';
          return;
        }
        
        list.innerHTML = bookings.slice(0, 10).map(b => {
          let statusClass = 'bg-gray-100 text-gray-800';
          if (b.booking_status === 'confirmed') statusClass = 'bg-green-100 text-green-800';
          else if (b.booking_status === 'pending') statusClass = 'bg-yellow-100 text-yellow-800';
          
          const title = (b.activity_title || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const firstName = (b.first_name || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const lastName = (b.last_name || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const email = (b.email || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          
          return '<div class="border rounded-lg p-4 hover:shadow-md transition">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1">' +
            '<h3 class="font-bold">' + title + '</h3>' +
            '<p class="text-sm text-gray-600">' + firstName + ' ' + lastName + ' • ' + email + '</p>' +
            '<div class="flex gap-4 mt-2 text-sm text-gray-600">' +
            '<span><i class="far fa-calendar mr-1"></i>' + (b.activity_date || '') + '</span>' +
            '<span><i class="far fa-clock mr-1"></i>' + (b.activity_time || '') + '</span>' +
            '<span><i class="far fa-user mr-1"></i>' + (b.num_participants || 0) + ' people</span>' +
            '</div>' +
            '</div>' +
            '<span class="px-3 py-1 rounded-full text-xs ' + statusClass + '">' + (b.booking_status || 'pending') + '</span>' +
            '</div>' +
            '</div>';
        }).join('');
      }

      function displayCallbacks(callbacks) {
        const list = document.getElementById('callbacksList');
        if (callbacks.length === 0) {
          list.innerHTML = '<p class="text-gray-500 text-center py-4">No callback requests yet</p>';
          return;
        }
        
        list.innerHTML = callbacks.map(cb => {
          let statusClass = 'bg-gray-100 text-gray-800';
          if (cb.status === 'contacted') statusClass = 'bg-blue-100 text-blue-800';
          else if (cb.status === 'completed') statusClass = 'bg-green-100 text-green-800';
          else if (cb.status === 'cancelled') statusClass = 'bg-red-100 text-red-800';
          else if (cb.status === 'pending') statusClass = 'bg-yellow-100 text-yellow-800';
          
          const firstName = (cb.first_name || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const lastName = (cb.last_name || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const phone = (cb.phone || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const email = (cb.email || 'N/A').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const activityTitle = (cb.activity_title || 'General Inquiry').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const message = (cb.message || 'No message').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const preferredTime = (cb.preferred_time || 'anytime').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          
          const statusButtons = cb.status === 'pending' 
            ? '<button onclick="updateCallbackStatus(' + cb.request_id + ', ' + String.fromCharCode(39) + 'contacted' + String.fromCharCode(39) + ')" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Mark Contacted</button>' +
              '<button onclick="updateCallbackStatus(' + cb.request_id + ', ' + String.fromCharCode(39) + 'completed' + String.fromCharCode(39) + ')" class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Complete</button>'
            : cb.status === 'contacted'
            ? '<button onclick="updateCallbackStatus(' + cb.request_id + ', ' + String.fromCharCode(39) + 'completed' + String.fromCharCode(39) + ')" class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Complete</button>'
            : '';
          
          return '<div class="border rounded-lg p-4 hover:shadow-md transition">' +
            '<div class="flex justify-between items-start mb-3">' +
            '<div class="flex-1">' +
            '<h3 class="font-bold text-lg">' + firstName + ' ' + lastName + '</h3>' +
            '<p class="text-sm text-orange-600 font-semibold"><i class="fas fa-clipboard-list mr-1"></i>' + activityTitle + '</p>' +
            '</div>' +
            '<span class="px-3 py-1 rounded-full text-xs font-semibold ' + statusClass + '">' + (cb.status || 'pending') + '</span>' +
            '</div>' +
            '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">' +
            '<div><i class="fas fa-phone mr-1 text-blue-600"></i>' + phone + '</div>' +
            '<div><i class="fas fa-envelope mr-1 text-blue-600"></i>' + email + '</div>' +
            '<div><i class="fas fa-clock mr-1 text-purple-600"></i>Preferred: ' + preferredTime + '</div>' +
            '<div><i class="fas fa-calendar mr-1 text-gray-500"></i>' + new Date(cb.created_at).toLocaleString() + '</div>' +
            '</div>' +
            (cb.message ? '<div class="bg-gray-50 p-3 rounded text-sm mb-3"><i class="fas fa-comment mr-1 text-gray-600"></i>' + message + '</div>' : '') +
            '<div class="flex gap-2">' +
            statusButtons +
            '</div>' +
            '</div>';
        }).join('');
      }
      
      async function updateCallbackStatus(requestId, status) {
        try {
          const response = await fetch(String.fromCharCode(47) + 'api' + String.fromCharCode(47) + 'vendor' + String.fromCharCode(47) + 'callbacks' + String.fromCharCode(47) + requestId, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Vendor-ID': vendorId
            },
            body: JSON.stringify({ status })
          });
          
          if (response.ok) {
            alert('Callback status updated!');
            loadDashboard();
          } else {
            alert('Failed to update callback status');
          }
        } catch (error) {
          console.error('Update callback error:', error);
          alert('Error updating callback status');
        }
      }

      function displayActivities(activities) {
        const list = document.getElementById('activitiesList');
        
        console.log('displayActivities called with:', activities ? activities.length : 'null', 'activities');
        
        if (!activities || activities.length === 0) {
          list.innerHTML = '<p class="text-gray-500 text-center py-8">No activities yet. Create your first activity above!</p>';
          return;
        }
        
        try {
          const html = activities.map(a => {
            const statusClass = a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
            const titleEscaped = String(a.title_en || 'Untitled').replace(/"/g, '&quot;').replace(/'/g, '&#39;').split('\\n').join(' ');
            const descEscaped = String(a.short_description_en || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').split('\\n').join(' ');
            
            return '<div class="border rounded-lg p-4 hover:shadow-md transition">' +
              '<div class="flex justify-between items-start">' +
              '<div class="flex-1">' +
              '<h3 class="text-xl font-bold">' + titleEscaped + '</h3>' +
              '<p class="text-gray-600 text-sm mt-1">' + descEscaped + '</p>' +
              '<div class="flex gap-4 mt-3 text-sm text-gray-600">' +
              '<span><i class="fas fa-tag mr-1"></i>' + (a.currency || 'USD') + ' ' + (a.price || 0) + '</span>' +
              '<span><i class="far fa-clock mr-1"></i>' + (a.duration_minutes || 0) + ' min</span>' +
              '<span><i class="far fa-user mr-1"></i>Max ' + (a.capacity_per_slot || 1) + '</span>' +
              '</div>' +
              '</div>' +
              '<div class="flex items-start gap-2">' +
              '<span class="px-3 py-1 rounded-full text-sm ' + statusClass + '">' + (a.status || 'draft') + '</span>' +
              '<button onclick="editActivity(' + a.activity_id + ')" class="text-blue-600 hover:text-blue-800 p-2" title="Edit">' +
              '<i class="fas fa-edit"></i>' +
              '</button>' +
              '<button onclick="deleteActivity(' + a.activity_id + ')" class="text-red-600 hover:text-red-800 p-2" title="Delete">' +
              '<i class="fas fa-trash"></i>' +
              '</button>' +
              '</div>' +
              '</div>' +
              '</div>';
          }).join('');
          
          list.innerHTML = html;
          console.log('Successfully rendered', activities.length, 'activities');
        } catch (error) {
          console.error('Error rendering activities:', error);
          list.innerHTML = '<p class="text-red-500 text-center py-8">Error displaying activities. Check console for details.</p>';
        }
      }

      // Profile form submission
      document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const specialties = document.getElementById('specialtiesInput').value.split(',').map(s => s.trim()).filter(s => s);
          const languages = document.getElementById('languagesInput').value.split(',').map(s => s.trim()).filter(s => s);
          
          const response = await fetch('/api/vendor/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Vendor-ID': vendorId },
            body: JSON.stringify({
              business_name: document.getElementById('businessNameInput').value,
              phone: document.getElementById('phoneInput').value,
              website: document.getElementById('websiteInput').value,
              description: document.getElementById('descriptionInput').value,
              address: document.getElementById('addressInput').value,
              city: document.getElementById('cityInput').value,
              country: document.getElementById('countryInput').value,
              years_experience: parseInt(document.getElementById('yearsExpInput').value) || null,
              specialties,
              languages_spoken: languages,
              operating_hours: null,
              social_media: null
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Profile updated successfully!');
            location.reload();
          } else {
            alert('Error: ' + (data.error || 'Failed to update profile'));
          }
        } catch (error) {
          console.error('Profile update error:', error);
          alert('Failed to update profile');
        }
      });

      // Profile image upload
      document.getElementById('profileImageInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const formData = new FormData();
          formData.append('image', file);
          
          const response = await fetch('/api/vendor/upload-profile-image', {
            method: 'POST',
            headers: { 'X-Vendor-ID': vendorId },
            body: formData
          });
          
          const data = await response.json();
          if (data.success) {
            document.getElementById('profileImagePreview').src = data.image_url;
            alert('Profile image updated!');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          alert('Failed to upload image');
        }
      });

      document.getElementById('addActivityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const editingId = form.dataset.editingId;
        const isEditing = !!editingId;
        
        try {
          // Get image URL from input
          const imageUrl = document.getElementById('activityImageUrl').value.trim();

          const activityData = {
            category_id: document.getElementById('category').value,
            title_en: document.getElementById('title').value,
            short_description_en: document.getElementById('shortDesc').value,
            full_description_en: document.getElementById('fullDesc').value,
            price: parseFloat(document.getElementById('price').value),
            duration_minutes: parseInt(document.getElementById('duration').value),
            capacity_per_slot: parseInt(document.getElementById('capacity').value),
            images: imageUrl ? [imageUrl] : [],
            video_url: document.getElementById('videoUrl').value || null,
            requirements: requirementsArray,
            includes: includesArray,
            excludes: excludesArray,
            status: 'active'
          };

          const url = isEditing ? '/api/vendor/activities/' + editingId : '/api/vendor/activities';
          const method = isEditing ? 'PUT' : 'POST';

          const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'X-Vendor-ID': vendorId },
            body: JSON.stringify(activityData)
          });

          const data = await response.json();
          if (data.success) {
            alert(isEditing ? 'Activity updated successfully!' : 'Activity created successfully!');
            
            // Reset form
            form.reset();
            delete form.dataset.editingId;
            clearAllArrays();
            
            // Reset button and title
            const formTitle = form.parentElement.querySelector('h2');
            formTitle.innerHTML = '<i class="fas fa-plus-circle mr-2 text-blue-600"></i>Add New Activity';
            document.getElementById('submitBtnText').textContent = 'Create Activity';
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            
            // Reload dashboard
            loadDashboard();
          } else {
            alert('Error: ' + (data.error || 'Failed to save activity'));
          }
        } catch (error) {
          console.error('Save activity error:', error);
          alert('Failed to save activity');
        }
      });

      async function editActivity(activityId) {
        try {
          // Fetch activity details
          const response = await fetch('/api/vendor/activities', {
            headers: { 'X-Vendor-ID': vendorId }
          });
          const data = await response.json();
          const activity = data.activities.find(a => a.activity_id === activityId);
          
          if (!activity) {
            alert('Activity not found');
            return;
          }
          
          // Populate form with activity data
          document.getElementById('title').value = activity.title_en;
          document.getElementById('category').value = activity.category_id;
          document.getElementById('price').value = activity.price;
          document.getElementById('duration').value = activity.duration_minutes;
          document.getElementById('capacity').value = activity.capacity_per_slot;
          
          // Parse and set image URL
          let images = [];
          try {
            images = activity.images ? JSON.parse(activity.images) : [];
          } catch (e) {
            images = Array.isArray(activity.images) ? activity.images : [];
          }
          document.getElementById('activityImageUrl').value = images[0] || '';
          
          document.getElementById('videoUrl').value = activity.video_url || '';
          document.getElementById('shortDesc').value = activity.short_description_en;
          document.getElementById('fullDesc').value = activity.full_description_en;
          
          // Populate requirements, includes, excludes
          try {
            requirementsArray = activity.requirements ? JSON.parse(activity.requirements) : [];
            if (!Array.isArray(requirementsArray)) requirementsArray = [];
          } catch (e) {
            requirementsArray = [];
          }
          
          try {
            includesArray = activity.includes ? JSON.parse(activity.includes) : [];
            if (!Array.isArray(includesArray)) includesArray = [];
          } catch (e) {
            includesArray = [];
          }
          
          try {
            excludesArray = activity.excludes ? JSON.parse(activity.excludes) : [];
            if (!Array.isArray(excludesArray)) excludesArray = [];
          } catch (e) {
            excludesArray = [];
          }
          
          updateRequirementsList();
          updateIncludesList();
          updateExcludesList();
          
          // Change form title and button
          const formTitle = document.querySelector('#addActivityForm').parentElement.querySelector('h2');
          formTitle.innerHTML = '<i class="fas fa-edit mr-2 text-blue-600"></i>Edit Activity';
          
          // Change submit button
          const form = document.getElementById('addActivityForm');
          document.getElementById('submitBtnText').textContent = 'Update Activity';
          const submitBtn = form.querySelector('button[type="submit"]');
          submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
          submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
          
          // Store activity ID for update
          form.dataset.editingId = activityId;
          
          // Scroll to form
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
          console.error('Edit activity error:', error);
          alert('Failed to load activity details');
        }
      }
      
      async function deleteActivity(activityId) {
        if (!confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
          return;
        }
        
        try {
          const response = await fetch('/api/vendor/activities/' + activityId, {
            method: 'DELETE',
            headers: { 'X-Vendor-ID': vendorId }
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Activity deleted successfully!');
            loadDashboard();
          } else {
            alert('Failed to delete activity: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Delete activity error:', error);
          alert('Failed to delete activity');
        }
      }

      function logout() {
        localStorage.removeItem('vendor_id');
        localStorage.removeItem('vendor_token');
        window.location.href = '/vendor/login';
      }

      // AI Proofreading function
      async function proofreadText(textareaId, userType) {
        const textarea = document.getElementById(textareaId);
        const text = textarea.value.trim();
        
        if (!text) {
          alert('Please enter some text first!');
          return;
        }
        
        if (text.length > 5000) {
          alert('Text is too long! Maximum 5000 characters allowed.');
          return;
        }
        
        // Get user ID
        const userId = userType === 'vendor' ? 
          localStorage.getItem('vendor_id') : 
          localStorage.getItem('property_id');
        
        if (!userId) {
          alert('User session not found. Please log in again.');
          return;
        }
        
        // Show loading state
        const originalText = textarea.value;
        textarea.value = '✨ AI is proofreading your text...';
        textarea.disabled = true;
        
        try {
          const response = await fetch('/api/ai/proofread', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: originalText,
              user_id: userId,
              user_type: userType
            })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Show success
            textarea.value = data.proofread_text;
            textarea.disabled = false;
            
            // Show usage stats
            const usageMsg = \`✅ Proofreading complete!\\n\\n📊 Your usage: \${data.usage.used}/\${data.usage.limit} today (\\n\${data.usage.remaining} remaining)\\n⚡ Processed in \${data.processing_time_ms}ms\`;
            
            if (data.model_used === 'fallback') {
              alert(usageMsg + '\\n\\n⚠️ Note: AI service is currently unavailable. Basic formatting applied.');
            } else {
              alert(usageMsg);
            }
          } else {
            // Handle errors
            textarea.value = originalText;
            textarea.disabled = false;
            
            if (response.status === 429) {
              if (data.wait_seconds) {
                alert(\`⏳ \${data.message}\\n\\nPlease wait \${data.wait_seconds} seconds before trying again.\`);
              } else {
                alert(\`🚫 \${data.message}\\n\\nYou've used \${data.used}/\${data.limit} requests today.\`);
              }
            } else {
              alert('❌ Error: ' + (data.error || 'Failed to proofread text'));
            }
          }
        } catch (error) {
          textarea.value = originalText;
          textarea.disabled = false;
          alert('❌ Network error. Please check your connection and try again.');
          console.error('Proofread error:', error);
        }
      }

      loadDashboard();
    </script>
</body>
</html>
  `)
})

// Browse Activities page
app.get('/browse', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Browse Activities</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-500 to-green-500 text-white py-4 px-4 shadow-lg sticky top-0 z-10">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
            <h1 class="text-2xl font-bold"><i class="fas fa-compass mr-2"></i>Browse Activities</h1>
            <span id="roomDisplay" class="text-sm bg-white/20 px-3 py-1 rounded-full"></span>
        </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- Filters -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="grid md:grid-cols-3 gap-4">
                <select id="categoryFilter" class="px-4 py-2 border rounded-lg"><option value="">All Categories</option></select>
                <select id="sortFilter" class="px-4 py-2 border rounded-lg">
                    <option value="popular">Most Popular</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                </select>
                <input type="search" id="searchBox" placeholder="Search activities..." class="px-4 py-2 border rounded-lg">
            </div>
        </div>

        <!-- Activities Grid -->
        <div id="activitiesGrid" class="grid md:grid-cols-3 gap-6"></div>

        <div id="loadingSpinner" class="text-center py-8"><div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto"></div></div>
    </div>

    <script>
      let activities = [];
      let categories = [];
      const sessionToken = new URLSearchParams(window.location.search).get('token') || localStorage.getItem('session_token');
      const propertyId = new URLSearchParams(window.location.search).get('property') || '1';

      async function loadData() {
        try {
          const [activitiesRes, categoriesRes] = await Promise.all([
            fetch('/api/activities?property_id=' + propertyId + '&lang=en'),
            fetch('/api/categories?lang=en')
          ]);

          const activitiesData = await activitiesRes.json();
          const categoriesData = await categoriesRes.json();

          activities = activitiesData.activities;
          categories = categoriesData.categories;

          const categoryFilter = document.getElementById('categoryFilter');
          categories.forEach(cat => {
            categoryFilter.innerHTML += '<option value="' + cat.category_id + '">' + cat.name + '</option>';
          });

          displayActivities();
          document.getElementById('loadingSpinner').style.display = 'none';
        } catch (error) {
          console.error('Load error:', error);
          alert('Failed to load activities');
        }
      }

      function displayActivities() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const sortFilter = document.getElementById('sortFilter').value;
        const searchText = document.getElementById('searchBox').value.toLowerCase();

        let filtered = activities.filter(a => {
          if (categoryFilter && a.category_id != categoryFilter) return false;
          if (searchText && !a.title.toLowerCase().includes(searchText)) return false;
          return true;
        });

        if (sortFilter === 'price_low') filtered.sort((a, b) => a.price - b.price);
        else if (sortFilter === 'price_high') filtered.sort((a, b) => b.price - a.price);
        else filtered.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

        const grid = document.getElementById('activitiesGrid');
        if (filtered.length === 0) {
          grid.innerHTML = '<div class="col-span-3 text-center py-12 text-gray-500"><i class="fas fa-search text-4xl mb-4"></i><p>No activities found</p></div>';
          return;
        }

        grid.innerHTML = filtered.map(a => \`
          <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer" onclick="viewActivity(\${a.activity_id})">
            <div class="h-48 bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center">
              <i class="fas fa-hiking text-white text-6xl opacity-75"></i>
            </div>
            <div class="p-4">
              <h3 class="font-bold text-lg mb-2">\${a.title}</h3>
              <p class="text-gray-600 text-sm mb-3 line-clamp-2">\${a.short_description}</p>
              <div class="flex justify-between items-center mb-3">
                <span class="text-blue-600 font-bold text-xl">\${a.currency} \${a.price}</span>
                <span class="text-gray-600 text-sm"><i class="far fa-clock mr-1"></i>\${a.duration_minutes} min</span>
              </div>
              <div class="text-sm text-gray-600 mb-3">
                <i class="fas fa-store mr-1"></i>\${a.vendor_name}
              </div>
              <button class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
                <i class="fas fa-calendar-check mr-2"></i>View Details & Book
              </button>
            </div>
          </div>
        \`).join('');
      }

      function viewActivity(id) {
        window.location.href = '/activity?id=' + id + '&token=' + sessionToken;
      }

      document.getElementById('categoryFilter').addEventListener('change', displayActivities);
      document.getElementById('sortFilter').addEventListener('change', displayActivities);
      document.getElementById('searchBox').addEventListener('input', displayActivities);

      loadData();
    </script>
</body>
</html>
  `)
})

// Vendor Profile page (public)
app.get('/vendor/:vendor_slug', async (c) => {
  const { DB } = c.env
  const { vendor_slug } = c.req.param()
  const property_id = c.req.query('property') || '1'
  
  try {
    const vendor = await DB.prepare(`
      SELECT v.* FROM vendors v
      JOIN vendor_properties vp ON v.vendor_id = vp.vendor_id
      WHERE v.slug = ? AND vp.property_id = ? AND v.status = 'active'
    `).bind(vendor_slug, property_id).first()
    
    if (!vendor) {
      return c.html('<html><body><h1>Vendor not found</h1></body></html>', 404)
    }
    
    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vendor.business_name} - Vendor Profile</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-500 to-green-500 text-white py-6 px-4">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
            <button onclick="history.back()" class="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"><i class="fas fa-arrow-left mr-2"></i>Back</button>
            <h1 class="text-2xl font-bold">Vendor Profile</h1>
            <div class="w-20"></div>
        </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-xl overflow-hidden mb-6">
            <div class="bg-gradient-to-r from-blue-500 to-green-500 h-32"></div>
            <div class="px-6 pb-6">
                <div class="flex items-end gap-6 -mt-16 mb-6">
                    <img src="${vendor.profile_image || 'https://via.placeholder.com/150'}" alt="${vendor.business_name}" class="w-32 h-32 rounded-full border-4 border-white object-cover">
                    <div class="flex-1 pt-16">
                        <h2 class="text-3xl font-bold">${vendor.business_name}</h2>
                        <div class="flex gap-4 mt-2 text-gray-600">
                            ${vendor.city ? '<span><i class="fas fa-map-marker-alt mr-1"></i>' + vendor.city + (vendor.country ? ', ' + vendor.country : '') + '</span>' : ''}
                            ${vendor.years_experience ? '<span><i class="fas fa-award mr-1"></i>' + vendor.years_experience + ' years experience</span>' : ''}
                            ${vendor.safety_rating ? '<span><i class="fas fa-star mr-1 text-yellow-500"></i>' + vendor.safety_rating + '/5.0</span>' : ''}
                        </div>
                    </div>
                </div>

                ${vendor.description ? '<div class="mb-6"><h3 class="text-xl font-bold mb-3">About Us</h3><p class="text-gray-700">' + vendor.description + '</p></div>' : ''}

                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 class="text-xl font-bold mb-3">Contact Information</h3>
                        <div class="space-y-2 text-gray-700">
                            ${vendor.phone ? '<p><i class="fas fa-phone mr-2 text-blue-600"></i>' + vendor.phone + '</p>' : ''}
                            ${vendor.email ? '<p><i class="fas fa-envelope mr-2 text-blue-600"></i>' + vendor.email + '</p>' : ''}
                            ${vendor.website ? '<p><i class="fas fa-globe mr-2 text-blue-600"></i><a href="' + vendor.website + '" target="_blank" class="text-blue-600 hover:underline">' + vendor.website + '</a></p>' : ''}
                            ${vendor.address ? '<p><i class="fas fa-map-marker-alt mr-2 text-blue-600"></i>' + vendor.address + '</p>' : ''}
                        </div>
                    </div>

                    <div>
                        <h3 class="text-xl font-bold mb-3">Details</h3>
                        <div class="space-y-2 text-gray-700" id="vendorDetails">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <h3 class="text-xl font-bold mb-3">Our Activities</h3>
                    <div id="activitiesList" class="grid md:grid-cols-3 gap-4">
                        <p class="text-gray-500 col-span-3 text-center py-4">Loading activities...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
      const vendorSlug = '${vendor_slug}';
      const propertyId = '${property_id}';
      
      async function loadVendorData() {
        try {
          const response = await fetch(\`/api/vendors/\${vendorSlug}?property_id=\${propertyId}\`);
          const data = await response.json();
          
          // Display specialties
          const details = document.getElementById('vendorDetails');
          if (data.vendor.specialties && data.vendor.specialties.length > 0) {
            details.innerHTML += '<p><i class="fas fa-certificate mr-2 text-blue-600"></i><strong>Specialties:</strong> ' + data.vendor.specialties.join(', ') + '</p>';
          }
          
          if (data.vendor.languages_spoken && data.vendor.languages_spoken.length > 0) {
            details.innerHTML += '<p><i class="fas fa-language mr-2 text-blue-600"></i><strong>Languages:</strong> ' + data.vendor.languages_spoken.join(', ') + '</p>';
          }
          
          // Display activities
          const activitiesList = document.getElementById('activitiesList');
          if (data.activities.length === 0) {
            activitiesList.innerHTML = '<p class="text-gray-500 col-span-3 text-center py-4">No activities available</p>';
          } else {
            activitiesList.innerHTML = data.activities.map(a => \`
              <a href="/activity?id=\${a.activity_id}" class="block bg-white border rounded-lg p-4 hover:shadow-lg transition">
                <h4 class="font-bold mb-2">\${a.title}</h4>
                <p class="text-sm text-gray-600 mb-3 line-clamp-2">\${a.short_description}</p>
                <div class="flex justify-between items-center">
                  <span class="text-blue-600 font-bold">\${a.currency} \${a.price}</span>
                  <span class="text-sm text-gray-600">\${a.duration_minutes} min</span>
                </div>
              </a>
            \`).join('');
          }
        } catch (error) {
          console.error('Load vendor data error:', error);
        }
      }
      
      loadVendorData();
    </script>
</body>
</html>
    `)
  } catch (error) {
    console.error('Vendor profile page error:', error)
    return c.html('<html><body><h1>Error</h1><p>Failed to load vendor profile</p></body></html>', 500)
  }
})

// Activity Detail page
app.get('/activity', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activity Details</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div id="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>

    <div id="content" class="hidden">
        <div class="bg-gradient-to-r from-blue-500 to-green-500 text-white py-4 px-4 sticky top-0 z-10 shadow-lg">
            <div class="max-w-4xl mx-auto flex items-center justify-between">
                <button onclick="history.back()" class="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"><i class="fas fa-arrow-left mr-2"></i>Back</button>
                <h1 class="text-xl font-bold" data-i18n="activity-details">Activity Details</h1>
                <select id="languageSelector" class="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm border border-white/30">
                    <option value="en">🇬🇧 EN</option>
                    <option value="ar">🇸🇦 AR</option>
                    <option value="de">🇩🇪 DE</option>
                    <option value="fr">🇫🇷 FR</option>
                    <option value="it">🇮🇹 IT</option>
                    <option value="ru">🇷🇺 RU</option>
                    <option value="pl">🇵🇱 PL</option>
                    <option value="cs">🇨🇿 CS</option>
                    <option value="uk">🇺🇦 UK</option>
                </select>
            </div>
        </div>

        <div class="max-w-4xl mx-auto px-4 py-8">
            <!-- Video Section (if available) -->
            <div id="videoSection" class="hidden mb-6">
                <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                    <video id="activityVideo" controls class="w-full" style="max-height: 500px;">
                        <source src="" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 id="activityTitle" class="text-3xl font-bold mb-2"></h2>
                <div class="flex items-end gap-4 mb-4">
                    <div><span id="price" class="text-4xl font-bold text-blue-600"></span><span class="text-gray-600" data-i18n="per-person">/person</span></div>
                    <div class="flex gap-4 text-sm text-gray-600">
                        <span><i class="far fa-clock mr-1"></i><span id="duration"></span></span>
                        <span><i class="far fa-user mr-1"></i><span data-i18n="max">Max</span> <span id="capacity"></span></span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="startBooking()" class="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-lg font-semibold">
                        <i class="fas fa-calendar-check mr-2"></i><span data-i18n="book-now">Book Now</span>
                    </button>
                    <button onclick="showCallbackForm()" class="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg text-lg font-semibold">
                        <i class="fas fa-phone mr-2"></i><span data-i18n="request-callback">Request Callback</span>
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold mb-3" data-i18n="about-activity">About This Activity</h3>
                <p id="description" class="text-gray-700"></p>
            </div>

            <!-- Requirements & Includes Section -->
            <div class="grid md:grid-cols-3 gap-4 mb-6">
                <!-- Requirements -->
                <div id="requirementsSection" class="hidden bg-blue-50 rounded-lg shadow p-5 border-2 border-blue-200">
                    <h4 class="font-bold text-blue-800 mb-3 flex items-center">
                        <i class="fas fa-info-circle mr-2"></i>Requirements
                    </h4>
                    <ul id="requirementsList" class="space-y-2 text-sm text-blue-800"></ul>
                </div>

                <!-- What's Included -->
                <div id="includesSection" class="hidden bg-green-50 rounded-lg shadow p-5 border-2 border-green-200">
                    <h4 class="font-bold text-green-800 mb-3 flex items-center">
                        <i class="fas fa-check-circle mr-2"></i>Included
                    </h4>
                    <ul id="includesList" class="space-y-2 text-sm text-green-800"></ul>
                </div>

                <!-- What's NOT Included -->
                <div id="excludesSection" class="hidden bg-red-50 rounded-lg shadow p-5 border-2 border-red-200">
                    <h4 class="font-bold text-red-800 mb-3 flex items-center">
                        <i class="fas fa-times-circle mr-2"></i>Not Included
                    </h4>
                    <ul id="excludesList" class="space-y-2 text-sm text-red-800"></ul>
                </div>
            </div>

            <!-- Vendor Information Card -->
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold mb-4"><i class="fas fa-user-tie mr-2 text-blue-500"></i>Activity Provider</h3>
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h4 id="vendorBusinessName" class="text-lg font-semibold text-gray-800 mb-2"></h4>
                        <div class="space-y-2 text-sm text-gray-600">
                            <p><i class="fas fa-phone mr-2 text-green-500"></i><span id="vendorPhone"></span></p>
                        </div>
                    </div>
                    <div>
                        <a id="vendorProfileLink" href="#" class="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition">
                            <i class="fas fa-user-circle mr-2"></i>View Profile
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Callback Request Modal -->
        <div id="callbackModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-2xl font-bold">Request Callback</h2>
                    <button onclick="closeCallbackModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
                </div>
                <form id="callbackForm" class="space-y-4">
                    <div><input type="text" id="cbFirstName" placeholder="First Name" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><input type="text" id="cbLastName" placeholder="Last Name" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><input type="tel" id="cbPhone" placeholder="Phone Number" required class="w-full px-4 py-2 border rounded-lg"></div>
                    <div><input type="email" id="cbEmail" placeholder="Email (optional)" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div>
                        <select id="cbPreferredTime" class="w-full px-4 py-2 border rounded-lg">
                            <option value="anytime">Anytime</option>
                            <option value="morning">Morning (9AM-12PM)</option>
                            <option value="afternoon">Afternoon (12PM-5PM)</option>
                            <option value="evening">Evening (5PM-8PM)</option>
                        </select>
                    </div>
                    <div><textarea id="cbMessage" placeholder="Your message or questions (optional)" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea></div>
                    <button type="submit" class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold">
                        <i class="fas fa-paper-plane mr-2"></i>Submit Request
                    </button>
                </form>
            </div>
        </div>

        <!-- Booking Modal -->
        <div id="bookingModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold">Book This Activity</h2>
                    <button onclick="closeBookingModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
                </div>
                
                <div id="step1" class="space-y-4">
                    <h3 class="text-lg font-semibold">Select Date & Time</h3>
                    <div><label class="block text-sm font-medium mb-2">Date</label><input type="date" id="bookingDate" class="w-full px-4 py-2 border rounded-lg"></div>
                    <div id="timeSlots" class="space-y-2"></div>
                    <button onclick="nextStep(2)" class="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold">Continue</button>
                </div>

                <div id="step2" class="hidden space-y-4">
                    <h3 class="text-lg font-semibold">Number of Participants</h3>
                    <div class="flex items-center gap-4">
                        <button onclick="changeParticipants(-1)" class="w-12 h-12 bg-gray-200 rounded-lg text-xl">-</button>
                        <span id="participantsCount" class="text-3xl font-bold">1</span>
                        <button onclick="changeParticipants(1)" class="w-12 h-12 bg-gray-200 rounded-lg text-xl">+</button>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg"><p class="text-sm text-gray-700">Total: <span id="totalPrice" class="font-bold text-xl text-blue-600"></span></p></div>
                    <div class="flex gap-4">
                        <button onclick="nextStep(1)" class="flex-1 bg-gray-200 py-3 rounded-lg">Back</button>
                        <button onclick="nextStep(3)" class="flex-1 bg-blue-500 text-white py-3 rounded-lg">Continue</button>
                    </div>
                </div>

                <div id="step3" class="hidden space-y-4">
                    <h3 class="text-lg font-semibold">Your Information</h3>
                    <input type="text" id="firstName" placeholder="First Name" required class="w-full px-4 py-2 border rounded-lg">
                    <input type="text" id="lastName" placeholder="Last Name" required class="w-full px-4 py-2 border rounded-lg">
                    <input type="email" id="email" placeholder="Email" required class="w-full px-4 py-2 border rounded-lg">
                    <input type="tel" id="phone" placeholder="Phone" required class="w-full px-4 py-2 border rounded-lg">
                    <textarea id="notes" placeholder="Special requests (optional)" class="w-full px-4 py-2 border rounded-lg" rows="3"></textarea>
                    <div class="flex gap-4">
                        <button onclick="nextStep(2)" class="flex-1 bg-gray-200 py-3 rounded-lg">Back</button>
                        <button onclick="nextStep(4)" class="flex-1 bg-blue-500 text-white py-3 rounded-lg">Continue</button>
                    </div>
                </div>

                <div id="step4" class="hidden space-y-4">
                    <h3 class="text-lg font-semibold">Payment Method</h3>
                    <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500">
                        <input type="radio" name="payment" value="pay_at_vendor" checked class="mr-3">
                        <div class="flex-1"><p class="font-semibold">Pay at Venue</p><p class="text-sm text-gray-600">Pay when you arrive</p></div>
                        <i class="fas fa-money-bill-wave text-2xl text-green-500"></i>
                    </label>
                    <div class="flex gap-4">
                        <button onclick="nextStep(3)" class="flex-1 bg-gray-200 py-3 rounded-lg">Back</button>
                        <button onclick="confirmBooking()" class="flex-1 bg-green-500 text-white py-3 rounded-lg"><i class="fas fa-check mr-2"></i>Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
      let activity = null;
      let selectedDate = null;
      let selectedTime = null;
      let participants = 1;
      const activityId = new URLSearchParams(window.location.search).get('id');
      const sessionToken = new URLSearchParams(window.location.search).get('token') || localStorage.getItem('session_token');
      
      // Get language from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      let currentLanguage = urlParams.get('lang') || localStorage.getItem('language') || 'en';
      localStorage.setItem('language', currentLanguage);
      
      // Translation dictionary - ALL LANGUAGES
      const translations = {
        en: {
          'activity-details': 'Activity Details',
          'back': 'Back',
          'book-now': 'Book Now',
          'request-callback': 'Request Callback',
          'about-activity': 'About This Activity',
          'per-person': '/person',
          'max': 'Max',
          'min': 'min'
        },
        ar: {
          'activity-details': 'تفاصيل النشاط',
          'back': 'رجوع',
          'book-now': 'احجز الآن',
          'request-callback': 'طلب معاودة الاتصال',
          'about-activity': 'حول هذا النشاط',
          'per-person': '/شخص',
          'max': 'الحد الأقصى',
          'min': 'دقيقة'
        },
        de: {
          'activity-details': 'Aktivitätsdetails',
          'back': 'Zurück',
          'book-now': 'Jetzt buchen',
          'request-callback': 'Rückruf anfordern',
          'about-activity': 'Über diese Aktivität',
          'per-person': '/Person',
          'max': 'Max',
          'min': 'Min'
        },
        fr: {
          'activity-details': 'Détails de l\\'activité',
          'back': 'Retour',
          'book-now': 'Réserver maintenant',
          'request-callback': 'Demander un rappel',
          'about-activity': 'À propos de cette activité',
          'per-person': '/personne',
          'max': 'Max',
          'min': 'min'
        },
        it: {
          'activity-details': 'Dettagli attività',
          'back': 'Indietro',
          'book-now': 'Prenota ora',
          'request-callback': 'Richiedi richiamata',
          'about-activity': 'Informazioni su questa attività',
          'per-person': '/persona',
          'max': 'Max',
          'min': 'min'
        },
        ru: {
          'activity-details': 'Детали мероприятия',
          'back': 'Назад',
          'book-now': 'Забронировать',
          'request-callback': 'Запросить звонок',
          'about-activity': 'Об этом мероприятии',
          'per-person': '/человек',
          'max': 'Макс',
          'min': 'мин'
        },
        pl: {
          'activity-details': 'Szczegóły aktywności',
          'back': 'Wstecz',
          'book-now': 'Zarezerwuj teraz',
          'request-callback': 'Poproś o telefon zwrotny',
          'about-activity': 'O tej aktywności',
          'per-person': '/osoba',
          'max': 'Maks',
          'min': 'min'
        },
        cs: {
          'activity-details': 'Detaily aktivity',
          'back': 'Zpět',
          'book-now': 'Rezervovat nyní',
          'request-callback': 'Požádat o zpětné volání',
          'about-activity': 'O této aktivitě',
          'per-person': '/osoba',
          'max': 'Max',
          'min': 'min'
        },
        uk: {
          'activity-details': 'Деталі заходу',
          'back': 'Назад',
          'book-now': 'Забронювати',
          'request-callback': 'Замовити дзвінок',
          'about-activity': 'Про цей захід',
          'per-person': '/особа',
          'max': 'Макс',
          'min': 'хв'
        }
      };
      
      function t(key) {
        return translations[currentLanguage]?.[key] || translations['en'][key] || key;
      }
      
      // AI Translation function for activity content
      async function translateText(text, targetLang) {
        if (targetLang === 'en' || !text) return text;
        
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: text,
              target_lang: targetLang,
              context: 'activity_description',
              persona: 'adventure_travel'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.translated_text || text;
          }
        } catch (error) {
          console.error('Translation error:', error);
        }
        
        return text; // Fallback to original
      }
      
      function updateLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        if (selector) {
          selector.value = currentLanguage;
          selector.addEventListener('change', function() {
            currentLanguage = this.value;
            localStorage.setItem('language', currentLanguage);
            window.location.href = '/activity?id=' + activityId + '&lang=' + currentLanguage;
          });
        }
      }
      
      function updateUITranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          el.textContent = t(key);
        });
      }

      async function init() {
        if (!activityId) { alert('Activity not found'); return; }
        try {
          const response = await fetch('/api/activities/' + activityId + '?lang=' + currentLanguage);
          const data = await response.json();
          activity = data.activity;

          // Set basic info
          document.getElementById('price').textContent = activity.currency + ' ' + activity.price;
          document.getElementById('duration').textContent = activity.duration_minutes + ' min';
          document.getElementById('capacity').textContent = activity.capacity_per_slot;

          // Translate title and description if needed
          let title = activity.title;
          let description = activity.full_description;
          
          // If language is not EN/AR, use AI translation
          if (currentLanguage !== 'en' && currentLanguage !== 'ar') {
            // Show loading state
            document.getElementById('activityTitle').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
            document.getElementById('description').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
            
            // Translate both title and description
            title = await translateText(activity.title_en || activity.title, currentLanguage);
            description = await translateText(activity.full_description_en || activity.full_description, currentLanguage);
          }
          
          document.getElementById('activityTitle').textContent = title;
          document.getElementById('description').textContent = description;

          // Display requirements if available
          if (activity.requirements) {
            let requirements = [];
            try {
              requirements = typeof activity.requirements === 'string' ? JSON.parse(activity.requirements) : activity.requirements;
            } catch (e) {
              requirements = [];
            }
            
            if (Array.isArray(requirements) && requirements.length > 0) {
              document.getElementById('requirementsSection').classList.remove('hidden');
              document.getElementById('requirementsList').innerHTML = requirements.map(req => 
                '<li class="flex items-start"><i class="fas fa-chevron-right mr-2 mt-1 text-blue-600"></i><span>' + req + '</span></li>'
              ).join('');
            }
          }

          // Display includes if available
          if (activity.includes) {
            let includes = [];
            try {
              includes = typeof activity.includes === 'string' ? JSON.parse(activity.includes) : activity.includes;
            } catch (e) {
              includes = [];
            }
            
            if (Array.isArray(includes) && includes.length > 0) {
              document.getElementById('includesSection').classList.remove('hidden');
              document.getElementById('includesList').innerHTML = includes.map(inc => 
                '<li class="flex items-start"><i class="fas fa-check mr-2 mt-1 text-green-600"></i><span>' + inc + '</span></li>'
              ).join('');
            }
          }

          // Display excludes if available
          if (activity.excludes) {
            let excludes = [];
            try {
              excludes = typeof activity.excludes === 'string' ? JSON.parse(activity.excludes) : activity.excludes;
            } catch (e) {
              excludes = [];
            }
            
            if (Array.isArray(excludes) && excludes.length > 0) {
              document.getElementById('excludesSection').classList.remove('hidden');
              document.getElementById('excludesList').innerHTML = excludes.map(exc => 
                '<li class="flex items-start"><i class="fas fa-times mr-2 mt-1 text-red-600"></i><span>' + exc + '</span></li>'
              ).join('');
            }
          }

          // Display video if available
          if (activity.video_url) {
            document.getElementById('videoSection').classList.remove('hidden');
            
            // Check if it's a YouTube URL - use simpler detection to avoid regex escaping issues
            let videoId = null;
            const url = activity.video_url;
            
            // Extract YouTube video ID
            if (url.includes('youtube.com/watch')) {
              const urlParams = new URLSearchParams(url.split('?')[1]);
              videoId = urlParams.get('v');
            } else if (url.includes('youtu.be/')) {
              videoId = url.split('youtu.be/')[1].split(/[?&]/)[0];
            } else if (url.includes('youtube.com/embed/')) {
              videoId = url.split('youtube.com/embed/')[1].split(/[?&]/)[0];
            }
            
            const youtubeMatch = videoId ? [null, videoId] : null;
            
            if (youtubeMatch && youtubeMatch[1]) {
              // It's a YouTube video - use iframe embed
              const videoId = youtubeMatch[1];
              const videoContainer = document.getElementById('videoSection').querySelector('.bg-white');
              videoContainer.innerHTML = \`
                <iframe 
                  id="activityVideo"
                  width="100%" 
                  height="500" 
                  src="https://www.youtube.com/embed/\${videoId}" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen
                  class="w-full rounded-lg"
                  style="max-height: 500px;">
                </iframe>
              \`;
            } else {
              // Direct video file (MP4, etc.)
              document.getElementById('activityVideo').querySelector('source').src = activity.video_url;
              document.getElementById('activityVideo').load();
            }
          }

          // Display vendor information
          document.getElementById('vendorBusinessName').textContent = activity.vendor_name;
          document.getElementById('vendorPhone').textContent = activity.vendor_phone || 'Not provided';
          
          // Set vendor profile link
          document.getElementById('vendorProfileLink').href = '/vendor/' + activity.vendor_slug;

          const today = new Date().toISOString().split('T')[0];
          document.getElementById('bookingDate').min = today;
          document.getElementById('bookingDate').value = today;

          // Update language selector and translations
          updateLanguageSelector();
          updateUITranslations();

          document.getElementById('loading').classList.add('hidden');
          document.getElementById('content').classList.remove('hidden');
        } catch (error) {
          console.error('Load error:', error);
          alert('Failed to load activity');
        }
      }

      function startBooking() {
        document.getElementById('bookingModal').classList.remove('hidden');
        loadTimeSlots();
      }

      function closeBookingModal() {
        document.getElementById('bookingModal').classList.add('hidden');
      }

      async function loadTimeSlots() {
        const date = document.getElementById('bookingDate').value;
        if (!date) return;
        try {
          const response = await fetch('/api/availability/' + activityId + '?date=' + date);
          const data = await response.json();
          const slotsHtml = data.slots.map(slot => '<button onclick="selectTime(\\'' + slot.time + '\\')" class="w-full p-3 border rounded-lg hover:border-blue-500"><div class="flex justify-between"><span>' + slot.time + '</span><span class="text-sm ' + (slot.available > 0 ? 'text-green-600' : 'text-red-600') + '">' + (slot.available > 0 ? slot.available + ' spots' : 'Full') + '</span></div></button>').join('');
          document.getElementById('timeSlots').innerHTML = slotsHtml;
        } catch (error) {
          console.error('Load slots error:', error);
        }
      }

      function selectTime(time) {
        selectedTime = time;
        document.querySelectorAll('#timeSlots button').forEach(btn => btn.classList.remove('border-blue-500', 'border-2'));
        event.target.closest('button').classList.add('border-blue-500', 'border-2');
      }

      function nextStep(step) {
        if (step === 2 && !selectedTime) { alert('Please select a time slot'); return; }
        document.querySelectorAll('[id^="step"]').forEach(el => el.classList.add('hidden'));
        document.getElementById('step' + step).classList.remove('hidden');
        if (step === 2) updateTotalPrice();
      }

      function changeParticipants(delta) {
        participants = Math.max(1, Math.min(activity.capacity_per_slot, participants + delta));
        document.getElementById('participantsCount').textContent = participants;
        updateTotalPrice();
      }

      function updateTotalPrice() {
        const total = activity.price * participants;
        document.getElementById('totalPrice').textContent = activity.currency + ' ' + total;
      }

      async function confirmBooking() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        if (!firstName || !lastName || !email || !phone) { alert('Please fill all fields'); return; }

        try {
          const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_token: sessionToken,
              activity_id: activityId,
              activity_date: document.getElementById('bookingDate').value,
              activity_time: selectedTime,
              num_participants: participants,
              payment_method: 'pay_at_vendor',
              guest_notes: document.getElementById('notes').value,
              guest_info: { first_name: firstName, last_name: lastName, email, phone }
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Booking confirmed! Reference: ' + data.booking_reference);
            window.location.href = '/browse?token=' + sessionToken;
          } else {
            alert('Booking failed: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Booking error:', error);
          alert('Failed to create booking');
        }
      }

      function showCallbackForm() {
        document.getElementById('callbackModal').classList.remove('hidden');
      }

      function closeCallbackModal() {
        document.getElementById('callbackModal').classList.add('hidden');
      }

      document.getElementById('callbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const response = await fetch('/api/callback-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: propertyId || 1,
              activity_id: activityId || null,
              vendor_id: activity ? activity.vendor_id : null,
              first_name: document.getElementById('cbFirstName').value,
              last_name: document.getElementById('cbLastName').value,
              phone: document.getElementById('cbPhone').value,
              email: document.getElementById('cbEmail').value || null,
              preferred_time: document.getElementById('cbPreferredTime').value,
              message: document.getElementById('cbMessage').value || null
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Callback request submitted! We will contact you soon.');
            closeCallbackModal();
            document.getElementById('callbackForm').reset();
          } else {
            alert('Error: ' + (data.error || 'Failed to submit request'));
          }
        } catch (error) {
          console.error('Callback request error:', error);
          alert('Failed to submit request');
        }
      });

      document.getElementById('bookingDate').addEventListener('change', loadTimeSlots);
      init();
    </script>
</body>
</html>
  `)
})

// SIMPLE TEST DASHBOARD
app.get('/admin/test', async (c) => {
  const { DB } = c.env
  const rooms = await DB.prepare(`SELECT * FROM rooms WHERE property_id = 1 ORDER BY room_number`).all()
  
  return c.html(`
<!DOCTYPE html>
<html>
<head>
    <title>Simple Test</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-8">
    <h1 class="text-3xl font-bold mb-4">SIMPLE API TEST</h1>
    <div class="bg-white p-6 rounded shadow">
        <h2 class="text-xl mb-4">Rooms from Database:</h2>
        <div id="roomsList"></div>
    </div>
    <script>
        async function loadRooms() {
            const response = await fetch('/api/admin/rooms?property_id=1');
            const rooms = await response.json();
            const list = document.getElementById('roomsList');
            list.innerHTML = rooms.map(r => \`
                <div class="border p-4 mb-2">
                    <strong>Room \${r.room_number}</strong> (\${r.room_type})
                    <br>QR: \${r.qr_code_data}
                </div>
            \`).join('');
        }
        loadRooms();
    </script>
</body>
</html>
  `)
})

// Admin Dashboard page
app.get('/admin/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      .tab-active { border-bottom: 3px solid #3B82F6; color: #3B82F6; }
      .hidden { display: none !important; }
      .tab-content { display: block; }
      .tab-btn { 
        cursor: pointer; 
        transition: all 0.3s;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .tab-btn:hover { background-color: rgba(59, 130, 246, 0.1); }
      
      /* Dark mode styles */
      .dark {
        color-scheme: dark;
      }
      
      .dark body {
        background-color: #1a202c !important;
        color: #e2e8f0 !important;
      }
      
      .dark .bg-white {
        background-color: #2d3748 !important;
      }
      
      .dark .bg-gray-50 {
        background-color: #1a202c !important;
      }
      
      .dark .bg-gray-100 {
        background-color: #2d3748 !important;
      }
      
      .dark .bg-gray-200 {
        background-color: #4a5568 !important;
      }
      
      .dark .text-gray-700 {
        color: #cbd5e0 !important;
      }
      
      .dark .text-gray-600 {
        color: #a0aec0 !important;
      }
      
      .dark .text-gray-800 {
        color: #e2e8f0 !important;
      }
      
      .dark .text-gray-900 {
        color: #f7fafc !important;
      }
      
      .dark .border {
        border-color: #4a5568 !important;
      }
      
      .dark .border-gray-200 {
        border-color: #4a5568 !important;
      }
      
      .dark .border-gray-300 {
        border-color: #4a5568 !important;
      }
      
      .dark input,
      .dark select,
      .dark textarea {
        background-color: #2d3748 !important;
        border-color: #4a5568 !important;
        color: #e2e8f0 !important;
      }
      
      .dark input::placeholder,
      .dark textarea::placeholder {
        color: #718096 !important;
      }
      
      .dark .shadow-lg {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2) !important;
      }
      
      .dark .shadow {
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2) !important;
      }
      
      /* Keep gradient backgrounds vibrant in dark mode */
      .dark .bg-gradient-to-r {
        opacity: 0.95;
      }
      
      /* Stats cards - keep their gradient colors */
      .dark .stats-card {
        opacity: 1 !important;
      }
      
      /* Tab button hover in dark mode */
      .dark .tab-btn:hover {
        background-color: rgba(59, 130, 246, 0.2) !important;
      }
      
      /* Date filter buttons in dark mode */
      .dark .date-filter-btn {
        background-color: #4a5568 !important;
        color: #e2e8f0 !important;
      }
      
      .dark .date-filter-btn.active {
        background-color: #3B82F6 !important;
        color: white !important;
      }
      
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        body { font-size: 14px; }
        
        .tab-btn {
          font-size: 0.75rem;
          padding: 0.5rem 0.75rem !important;
        }
        .tab-btn i { display: none; }
        .tab-btn span { font-size: 0.75rem; }
        
        h1 { font-size: 1.25rem !important; }
        h2 { font-size: 1.125rem !important; }
        h3 { font-size: 1rem !important; }
        
        /* Make all form inputs stack on mobile */
        .grid {
          grid-template-columns: 1fr !important;
        }
        
        /* Stats cards mobile */
        .stats-card {
          padding: 1rem !important;
        }
        .stats-card .text-3xl {
          font-size: 1.5rem !important;
        }
        .stats-card i {
          font-size: 2rem !important;
        }
        
        /* Better mobile padding */
        .p-6 { padding: 1rem !important; }
        .py-8 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
        .px-8 { padding-left: 1rem !important; padding-right: 1rem !important; }
        
        /* Mobile buttons */
        button, .btn {
          padding: 0.5rem 1rem !important;
          font-size: 0.875rem !important;
        }
        
        /* QR Code section mobile */
        #qrCodeDisplay {
          padding: 1rem !important;
          max-width: 200px;
          margin: 0 auto;
        }
        #qrCodeDisplay img {
          max-width: 100%;
          height: auto;
        }
        
        /* Tables scroll on mobile */
        table {
          display: block;
          overflow-x: auto;
          white-space: nowrap;
        }
        
        /* Form fields full width on mobile */
        input[type="text"],
        input[type="email"],
        input[type="tel"],
        input[type="url"],
        input[type="number"],
        input[type="password"],
        select,
        textarea {
          width: 100% !important;
        }
      }
      
      @media (min-width: 769px) {
        .mobile-menu-btn { display: none; }
      }
      
      /* Hide scrollbar but keep functionality */
      .overflow-x-auto::-webkit-scrollbar {
        height: 4px;
      }
      .overflow-x-auto::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      .overflow-x-auto::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
    </style>
</head>
<body class="bg-gray-50 transition-colors duration-300">
    <div class="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-3 md:py-4 px-3 md:px-4 shadow-lg transition-colors duration-300">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div><h1 class="text-lg md:text-2xl font-bold">Admin Dashboard</h1></div>
            <div class="flex items-center gap-2 md:gap-3">
                <button onclick="openSupportModal()" class="bg-white/20 hover:bg-white/30 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base transition-colors" title="Get Support">
                  <i class="fas fa-life-ring"></i><span class="hidden md:inline ml-2">Support</span>
                </button>
                <button onclick="openLiveChat()" class="bg-white/20 hover:bg-white/30 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base transition-colors" title="Live Chat">
                  <i class="fas fa-comments"></i><span class="hidden md:inline ml-2">Chat</span>
                </button>
                <button onclick="toggleDarkMode()" class="bg-white/20 hover:bg-white/30 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base transition-colors" title="Toggle Dark Mode">
                  <i id="darkModeIcon" class="fas fa-moon"></i><span class="hidden md:inline ml-2" id="darkModeText">Dark</span>
                </button>
                <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base">
                  <i class="fas fa-sign-out-alt mr-0 md:mr-2"></i><span class="hidden md:inline">Logout</span>
                </button>
            </div>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8">
        <!-- Tabs -->
        <div class="bg-white rounded-lg shadow mb-4 md:mb-6">
            <div class="flex overflow-x-auto scrollbar-thin">
                <button data-tab="qrcode" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold tab-active"><i class="fas fa-qrcode mr-2"></i><span>QR Code</span></button>
                <button data-tab="analytics" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-chart-line mr-2"></i><span>Analytics</span></button>
                <button data-tab="vendors" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-store mr-2"></i><span>Vendors</span></button>
                <button data-tab="regcode" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-key mr-2"></i><span>Code</span></button>
                <button data-tab="offerings" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-utensils mr-2"></i><span>Offerings</span></button>
                <button data-tab="customsections" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-layer-group mr-2"></i><span>Sections</span></button>
                <button data-tab="infopages" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-file-alt mr-2"></i><span>Info Pages</span></button>
                <button data-tab="activities" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-hiking mr-2"></i><span>Activities</span></button>
                <button data-tab="callbacks" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-phone mr-2"></i><span>Callbacks</span></button>
                <button data-tab="settings" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-cog mr-2"></i><span>Settings</span></button>
                <button data-tab="chatbot" class="tab-btn px-4 md:px-6 py-3 md:py-4 font-semibold"><i class="fas fa-robot mr-2"></i><span>AI Chatbot</span></button>
            </div>
        </div>

        <!-- Master QR Code Tab -->
        <div id="qrcodeTab" class="tab-content">
            <!-- QR Code Card Designer -->
            <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-4 md:mb-6">
                <h2 class="text-xl md:text-2xl font-bold mb-3 md:mb-4">
                    <i class="fas fa-palette mr-2 text-purple-600"></i>QR Code Card Designer
                </h2>
                <p class="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Create a beautiful, print-ready QR code card for your hotel with custom text, colors, and festive decorations.</p>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Left: Designer Controls -->
                    <div class="space-y-4">
                        <!-- Card Text -->
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h3 class="font-bold text-lg mb-3 text-blue-900"><i class="fas fa-text mr-2"></i>Card Text</h3>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Main Title</label>
                                    <input type="text" id="cardTitle" class="w-full p-2 border rounded" placeholder="Scan for Hotel Services" />
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Subtitle</label>
                                    <input type="text" id="cardSubtitle" class="w-full p-2 border rounded" placeholder="Access all amenities and services" />
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Bottom Message (optional)</label>
                                    <input type="text" id="cardMessage" class="w-full p-2 border rounded" placeholder="e.g., Scan here for info, Welcome!" />
                                </div>
                            </div>
                        </div>

                        <!-- Styling Options -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="font-bold text-lg mb-3 text-green-900"><i class="fas fa-paint-brush mr-2"></i>Colors & Style</h3>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Background</label>
                                    <input type="color" id="bgColor" class="w-full h-10 border rounded cursor-pointer" value="#ffffff" />
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Text Color</label>
                                    <input type="color" id="textColor" class="w-full h-10 border rounded cursor-pointer" value="#000000" />
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">QR Size</label>
                                    <select id="qrSize" class="w-full p-2 border rounded">
                                        <option value="250">Small (250px)</option>
                                        <option value="300" selected>Medium (300px)</option>
                                        <option value="400">Large (400px)</option>
                                        <option value="500">Extra Large (500px)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Border Radius</label>
                                    <input type="range" id="borderRadius" min="0" max="30" value="10" class="w-full" />
                                    <span id="borderRadiusValue" class="text-xs text-gray-600">10px</span>
                                </div>
                            </div>
                        </div>

                        <!-- Festive Overlays -->
                        <div class="bg-orange-50 p-4 rounded-lg">
                            <h3 class="font-bold text-lg mb-3 text-orange-900"><i class="fas fa-gift mr-2"></i>Festive Decorations</h3>
                            <p class="text-xs text-gray-600 mb-3">Add seasonal overlays to your QR code</p>
                            <div class="grid grid-cols-3 gap-2">
                                <button onclick="setFestiveOverlay(null, event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-blue-500 transition">
                                    <div class="text-2xl mb-1">❌</div>
                                    <div class="text-xs">None</div>
                                </button>
                                <button onclick="setFestiveOverlay('christmas', event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-red-500 transition">
                                    <div class="text-2xl mb-1">🎅</div>
                                    <div class="text-xs">Christmas</div>
                                </button>
                                <button onclick="setFestiveOverlay('newyear', event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-yellow-500 transition">
                                    <div class="text-2xl mb-1">🎊</div>
                                    <div class="text-xs">New Year</div>
                                </button>
                                <button onclick="setFestiveOverlay('easter', event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-pink-500 transition">
                                    <div class="text-2xl mb-1">🐰</div>
                                    <div class="text-xs">Easter</div>
                                </button>
                                <button onclick="setFestiveOverlay('ramadan', event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-purple-500 transition">
                                    <div class="text-2xl mb-1">🌙</div>
                                    <div class="text-xs">Ramadan</div>
                                </button>
                                <button onclick="setFestiveOverlay('eid', event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-green-500 transition">
                                    <div class="text-2xl mb-1">🕌</div>
                                    <div class="text-xs">Eid</div>
                                </button>
                                <button onclick="setFestiveOverlay('halloween', event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-orange-500 transition">
                                    <div class="text-2xl mb-1">🎃</div>
                                    <div class="text-xs">Halloween</div>
                                </button>
                                <button onclick="setFestiveOverlay('valentine', event)" class="festive-btn border-2 border-gray-300 bg-white p-3 rounded-lg hover:border-red-500 transition">
                                    <div class="text-2xl mb-1">💝</div>
                                    <div class="text-xs">Valentine</div>
                                </button>
                            </div>
                            <div id="currentOverlay" class="mt-3 text-sm font-semibold text-orange-800">Current: None</div>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-2">
                            <button onclick="saveQRCard()" class="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold">
                                <i class="fas fa-save mr-2"></i>Save Design
                            </button>
                            <button onclick="resetQRCard()" class="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500">
                                <i class="fas fa-undo mr-2"></i>Reset
                            </button>
                        </div>
                    </div>

                    <!-- Right: Live Preview -->
                    <div class="space-y-4">
                        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                            <h3 class="text-lg font-bold mb-4 text-center text-indigo-900">
                                <i class="fas fa-eye mr-2"></i>Live Preview
                            </h3>
                            
                            <!-- QR Card Preview -->
                            <div id="qrCardPreview" class="mx-auto" style="max-width: 500px;">
                                <div id="qrCard" class="relative" style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); text-align: center;">
                                    <!-- Title -->
                                    <div id="previewTitle" class="text-2xl font-bold mb-2" style="color: #000;">Scan for Hotel Services</div>
                                    
                                    <!-- Subtitle -->
                                    <div id="previewSubtitle" class="text-base mb-4 opacity-80" style="color: #000;">Access all amenities and services</div>
                                    
                                    <!-- QR Code Container with Festive Overlay -->
                                    <div class="relative inline-block mb-4">
                                        <div id="qrCodePreview" class="bg-white p-4 rounded-lg inline-block" style="position: relative;">
                                            <img id="qrImage" alt="QR Code" style="display: block; width: 300px; height: 300px;" />
                                        </div>
                                        <!-- Festive Overlay (positioned over QR) -->
                                        <div id="festiveOverlayDiv" style="position: absolute; top: -20px; right: -20px; font-size: 80px; display: none;">🎅</div>
                                    </div>
                                    
                                    <!-- Bottom Message -->
                                    <div id="previewMessage" class="text-sm font-semibold opacity-70" style="color: #000; min-height: 20px;"></div>
                                    
                                    <!-- Hotel Name -->
                                    <div id="previewHotelName" class="text-xs mt-3 opacity-60" style="color: #000;">Loading...</div>
                                </div>
                            </div>

                            <!-- Print Actions -->
                            <div class="mt-6 flex flex-col sm:flex-row gap-2">
                                <button onclick="downloadQRCard()" class="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold">
                                    <i class="fas fa-download mr-2"></i>Download Card
                                </button>
                                <button onclick="printQRCard()" class="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-bold">
                                    <i class="fas fa-print mr-2"></i>Print Card
                                </button>
                            </div>
                        </div>

                        <!-- Quick Tips -->
                        <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <h4 class="font-bold text-yellow-900 mb-2"><i class="fas fa-lightbulb mr-2"></i>Print Tips</h4>
                            <ul class="text-xs text-yellow-800 space-y-1">
                                <li>• Use high-quality paper (cardstock recommended)</li>
                                <li>• Print at 300 DPI or higher for best results</li>
                                <li>• Test scan QR code before mass printing</li>
                                <li>• Laminate cards for durability</li>
                                <li>• Place in room tents, key card holders, or wall frames</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- QR Code Details Section (Collapsible) -->
            <div class="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <details class="group">
                    <summary class="cursor-pointer text-lg font-bold text-gray-700 hover:text-blue-600 transition">
                        <i class="fas fa-info-circle mr-2"></i>QR Code Details & Technical Info
                        <i class="fas fa-chevron-down ml-2 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="mt-4 space-y-3">
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-xs text-gray-600 mb-1">Hotel Landing Page URL:</p>
                            <p id="hotelURL" class="font-mono text-sm text-blue-600 break-all">Loading...</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-xs text-gray-600 mb-1">Property Name:</p>
                            <p id="propertyName" class="font-semibold">Loading...</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-xs text-gray-600 mb-1">Property Slug:</p>
                            <p id="propertySlug" class="font-mono text-sm">Loading...</p>
                        </div>
                    </div>
                </details>
            </div>
        </div>

        <!-- Analytics Tab -->
        <div id="analyticsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-4 md:mb-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
                    <h2 class="text-xl md:text-2xl font-bold mb-3 md:mb-0"><i class="fas fa-chart-line mr-2 text-green-600"></i>Analytics & Usage Stats</h2>
                    
                    <!-- Date Range Filter -->
                    <div class="flex flex-wrap gap-2">
                        <button onclick="filterAnalytics('today')" class="date-filter-btn active px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Today</button>
                        <button onclick="filterAnalytics('yesterday')" class="date-filter-btn px-3 py-1.5 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Yesterday</button>
                        <button onclick="filterAnalytics('7days')" class="date-filter-btn px-3 py-1.5 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Last 7 Days</button>
                        <button onclick="filterAnalytics('30days')" class="date-filter-btn px-3 py-1.5 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Last 30 Days</button>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
                    <div class="stats-card bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4 md:p-6">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex-1">
                                <p class="text-blue-100 text-xs md:text-sm">QR Code Scans</p>
                                <p class="text-2xl md:text-3xl font-bold" id="totalScans">0</p>
                            </div>
                            <i class="fas fa-qrcode text-2xl md:text-4xl opacity-30"></i>
                        </div>
                        <div id="scansComparison" class="text-xs md:text-sm text-blue-100 flex items-center gap-1">
                            <i class="fas fa-spinner fa-spin"></i> Loading...
                        </div>
                    </div>
                    <div class="stats-card bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-4 md:p-6">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex-1">
                                <p class="text-green-100 text-xs md:text-sm">Bookings</p>
                                <p class="text-2xl md:text-3xl font-bold" id="activeBookings">0</p>
                            </div>
                            <i class="fas fa-calendar-check text-2xl md:text-4xl opacity-30"></i>
                        </div>
                        <div id="bookingsComparison" class="text-xs md:text-sm text-green-100 flex items-center gap-1">
                            <i class="fas fa-spinner fa-spin"></i> Loading...
                        </div>
                    </div>
                    <div class="stats-card bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-4 md:p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-purple-100 text-xs md:text-sm">Total Activities</p>
                                <p class="text-2xl md:text-3xl font-bold" id="totalActivities">0</p>
                            </div>
                            <i class="fas fa-hiking text-2xl md:text-4xl opacity-30"></i>
                        </div>
                    </div>
                    <div class="stats-card bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-4 md:p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-orange-100 text-xs md:text-sm">Total Vendors</p>
                                <p class="text-2xl md:text-3xl font-bold" id="totalVendors">0</p>
                            </div>
                            <i class="fas fa-store text-2xl md:text-4xl opacity-30"></i>
                        </div>
                    </div>
                </div>

                <!-- Popular Sections -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div class="bg-white border rounded-lg p-4 md:p-6">
                        <h3 class="text-base md:text-lg font-bold mb-3 md:mb-4 text-gray-700"><i class="fas fa-fire mr-2 text-red-500"></i>Most Popular Activities</h3>
                        <div id="popularActivities" class="space-y-2 md:space-y-3">
                            <div class="text-center text-gray-400 py-6 md:py-8">
                                <i class="fas fa-spinner fa-spin text-xl md:text-2xl mb-2"></i>
                                <p class="text-sm md:text-base">Loading...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white border rounded-lg p-4 md:p-6">
                        <h3 class="text-base md:text-lg font-bold mb-3 md:mb-4 text-gray-700"><i class="fas fa-star mr-2 text-yellow-500"></i>Most Viewed Sections</h3>
                        <div id="popularSections" class="space-y-2 md:space-y-3">
                            <div class="text-center text-gray-400 py-6 md:py-8">
                                <i class="fas fa-spinner fa-spin text-xl md:text-2xl mb-2"></i>
                                <p class="text-sm md:text-base">Loading...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Old Rooms Tab (keep for backward compatibility but hide) -->
        <div id="roomsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-door-open mr-2 text-blue-600"></i>Individual Room QR Codes (Legacy)</h2>
                <form id="addRoomForm" class="grid md:grid-cols-3 gap-4">
                    <input type="text" id="roomNumber" placeholder="Room Number (e.g., 101)" required class="px-4 py-2 border rounded-lg">
                    <select id="roomType" required class="px-4 py-2 border rounded-lg">
                        <option value="">Select Type...</option>
                        <option value="Standard">Standard</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Suite">Suite</option>
                        <option value="Villa">Villa</option>
                    </select>
                    <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>Create Room & QR Code</button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">Rooms & QR Codes</h2>
                <div id="roomsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Vendors Tab -->
        <div id="vendorsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-4 md:mb-6">
                <h2 class="text-xl md:text-2xl font-bold mb-3 md:mb-4"><i class="fas fa-user-plus mr-2 text-green-600"></i>Add New Vendor</h2>
                <form id="addVendorForm" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <input type="text" id="businessName" placeholder="Business Name" required class="w-full px-3 md:px-4 py-2 border rounded-lg text-sm md:text-base">
                        <input type="email" id="vendorEmail" placeholder="Email" required class="w-full px-3 md:px-4 py-2 border rounded-lg text-sm md:text-base">
                        <input type="text" id="vendorPhone" placeholder="Phone" required class="w-full px-3 md:px-4 py-2 border rounded-lg text-sm md:text-base">
                        <input type="password" id="vendorPassword" placeholder="Password" required class="w-full px-3 md:px-4 py-2 border rounded-lg text-sm md:text-base">
                    </div>
                    <button type="submit" class="w-full sm:w-auto bg-green-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-green-700 text-sm md:text-base"><i class="fas fa-check mr-2"></i>Add Vendor</button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 class="text-xl md:text-2xl font-bold mb-3 md:mb-4">All Vendors</h2>
                <div id="vendorsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Registration Code Tab -->
        <div id="regcodeTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-key mr-2 text-purple-600"></i>Vendor Registration Code</h2>
                <p class="text-gray-600 mb-4">Share this code with vendors so they can self-register to your hotel</p>
                
                <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <p class="text-sm text-gray-600 mb-2">Current Registration Code</p>
                            <p class="text-4xl font-bold text-blue-600" id="regCode">Loading...</p>
                        </div>
                        <button onclick="regenerateRegCode()" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                            <i class="fas fa-sync mr-2"></i>Regenerate Code
                        </button>
                    </div>
                    <p class="text-sm text-gray-600">Expires: <span id="regCodeExpiry">Loading...</span></p>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="font-bold mb-2">How it works:</h3>
                    <ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Share this registration code with your vendors</li>
                        <li>Vendors visit the registration page at <code class="bg-white px-2 py-1 rounded">/vendor/register</code></li>
                        <li>They enter the code along with their business details</li>
                        <li>Once registered, they can immediately add activities to your hotel</li>
                    </ol>
                </div>
            </div>
        </div>

        <!-- Hotel Offerings Tab -->
        <div id="offeringsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-plus-circle mr-2 text-green-600"></i>Add New Hotel Offering</h2>
                <form id="addOfferingForm" class="space-y-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <select id="offeringType" required class="px-4 py-2 border rounded-lg">
                            <option value="">Select Type...</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="event">Event</option>
                            <option value="spa">Spa/Wellness</option>
                            <option value="service">Other Service</option>
                        </select>
                        <input type="text" id="offeringTitle" placeholder="Title (English)" required class="px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <label class="block text-sm font-medium">Short Description</label>
                            <button type="button" onclick="proofreadText('offeringDescription', 'admin')" class="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition flex items-center gap-1">
                                <i class="fas fa-magic"></i> AI Proofread
                            </button>
                        </div>
                        <textarea id="offeringDescription" placeholder="Short description" required class="w-full px-4 py-2 border rounded-lg" rows="2"></textarea>
                        <p class="text-xs text-gray-500 mt-1">✨ Use AI Proofread to improve grammar and clarity (10 free per day)</p>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <label class="block text-sm font-medium">Full Description</label>
                            <button type="button" onclick="proofreadText('offeringFullDescription', 'admin')" class="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition flex items-center gap-1">
                                <i class="fas fa-magic"></i> AI Proofread
                            </button>
                        </div>
                        <textarea id="offeringFullDescription" placeholder="Full description" class="w-full px-4 py-2 border rounded-lg" rows="3"></textarea>
                        <p class="text-xs text-gray-500 mt-1">✨ Use AI Proofread to improve grammar and clarity (10 free per day)</p>
                    </div>
                    <div class="grid md:grid-cols-3 gap-4">
                        <input type="number" id="offeringPrice" placeholder="Price" step="0.01" class="px-4 py-2 border rounded-lg">
                        <input type="text" id="offeringLocation" placeholder="Location" class="px-4 py-2 border rounded-lg">
                        <input type="number" id="offeringDuration" placeholder="Duration (minutes)" class="px-4 py-2 border rounded-lg">
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <textarea id="offeringImages" placeholder="Image URLs (one per line)" class="px-4 py-2 border rounded-lg w-full" rows="3"></textarea>
                        <input type="url" id="offeringVideoUrl" placeholder="Video URL (direct link to MP4)" class="px-4 py-2 border rounded-lg">
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <label class="flex items-center px-4 py-2 border rounded-lg">
                            <input type="checkbox" id="offeringRequiresBooking" class="mr-2">
                            <span>Requires Booking</span>
                        </label>
                    </div>
                    
                    <!-- Restaurant-specific fields (menus) -->
                    <div id="restaurantFields" class="hidden space-y-4">
                        <div class="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50">
                            <h3 class="font-bold text-orange-800 mb-2 flex items-center">
                                <i class="fas fa-utensils mr-2"></i>Restaurant Menus
                            </h3>
                            <p class="text-sm text-orange-700 mb-3">Add menu images (paste image URLs, one per line)</p>
                            <textarea 
                                id="menuUrls" 
                                placeholder="Menu Image URLs (one per line)&#10;Example:&#10;https://example.com/breakfast-menu.jpg&#10;https://example.com/lunch-menu.jpg&#10;https://example.com/dinner-menu.jpg" 
                                class="w-full px-4 py-2 border rounded-lg" 
                                rows="4"></textarea>
                            <p class="text-xs text-gray-600 mt-2">
                                <i class="fas fa-info-circle mr-1"></i>
                                Upload images to Imgur, Cloudinary, or any image host, then paste URLs here
                            </p>
                        </div>
                    </div>
                    
                    <!-- Event-specific fields (hidden by default) -->
                    <div id="eventFields" class="hidden grid md:grid-cols-3 gap-4">
                        <input type="date" id="eventDate" placeholder="Event Date" class="px-4 py-2 border rounded-lg">
                        <input type="time" id="eventStartTime" placeholder="Start Time" class="px-4 py-2 border rounded-lg">
                        <input type="time" id="eventEndTime" placeholder="End Time" class="px-4 py-2 border rounded-lg">
                    </div>
                    
                    <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                        <i class="fas fa-check mr-2"></i>Add Offering
                    </button>
                </form>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">All Hotel Offerings</h2>
                    <button 
                        onclick="translateAllOfferings()" 
                        id="translateAllBtn"
                        class="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all">
                        <i class="fas fa-language mr-2"></i>Translate All to 8 Languages
                    </button>
                </div>
                <div class="mb-4 flex gap-2">
                    <button onclick="filterOfferings('all')" class="offering-filter-btn px-4 py-2 rounded bg-blue-500 text-white" data-type="all">All</button>
                    <button onclick="filterOfferings('restaurant')" class="offering-filter-btn px-4 py-2 rounded bg-gray-200" data-type="restaurant"><span id="admin-pill-restaurants">Restaurants</span></button>
                    <button onclick="filterOfferings('event')" class="offering-filter-btn px-4 py-2 rounded bg-gray-200" data-type="event"><span id="admin-pill-events">Events</span></button>
                    <button onclick="filterOfferings('spa')" class="offering-filter-btn px-4 py-2 rounded bg-gray-200" data-type="spa"><span id="admin-pill-spa">Spa</span></button>
                </div>
                <div id="offeringsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Custom Sections Tab -->
        <div id="customsectionsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4">
                    <i class="fas fa-plus-circle mr-2 text-blue-600"></i>
                    Add Custom Section
                </h2>
                <p class="text-gray-600 mb-4">Create additional sections for your hotel homepage (e.g., Pool Bar, Kids Club, Rooftop Lounge)</p>
                <form id="addCustomSectionForm" class="space-y-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <input type="text" id="sectionKey" placeholder="Section Key (e.g., pool-bar)" required class="px-4 py-2 border rounded-lg">
                        <input type="text" id="sectionNameEn" placeholder="Section Name (English)" required class="px-4 py-2 border rounded-lg">
                    </div>
                    <div class="grid md:grid-cols-3 gap-4">
                        <select id="sectionIcon" class="px-4 py-2 border rounded-lg">
                            <option value="fas fa-star">⭐ Star</option>
                            <option value="fas fa-swimming-pool">🏊 Pool</option>
                            <option value="fas fa-cocktail">🍹 Bar</option>
                            <option value="fas fa-child">👶 Kids</option>
                            <option value="fas fa-gamepad">🎮 Gaming</option>
                            <option value="fas fa-dumbbell">🏋️ Fitness</option>
                            <option value="fas fa-graduation-cap">🎓 Business Center</option>
                            <option value="fas fa-gift">🎁 Gift Shop</option>
                            <option value="fas fa-coffee">☕ Cafe</option>
                            <option value="fas fa-music">🎵 Entertainment</option>
                        </select>
                        <select id="sectionColor" class="px-4 py-2 border rounded-lg">
                            <option value="blue">Blue</option>
                            <option value="purple">Purple</option>
                            <option value="green">Green</option>
                            <option value="orange">Orange</option>
                            <option value="red">Red</option>
                            <option value="pink">Pink</option>
                            <option value="indigo">Indigo</option>
                            <option value="teal">Teal</option>
                        </select>
                        <input type="number" id="sectionOrder" placeholder="Display Order" value="10" class="px-4 py-2 border rounded-lg">
                    </div>
                    <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-check mr-2"></i>Create Section
                    </button>
                </form>
            </div>
            
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Custom Sections</h2>
                <div id="customSectionsList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Info Pages Tab -->
        <div id="infopagesTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold"><i class="fas fa-file-alt mr-2 text-purple-600"></i>Info Pages Management</h2>
                        <p class="text-gray-600 mt-1">Create standalone information pages for your guests (not displayed on homepage)</p>
                    </div>
                    <button onclick="showInfoPageModal()" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold">
                        <i class="fas fa-plus mr-2"></i>Create New Page
                    </button>
                </div>

                <!-- Info Pages List -->
                <div id="infoPagesContainer" class="space-y-4">
                    <div class="text-center py-8 text-gray-400">
                        <i class="fas fa-spinner fa-spin text-3xl"></i>
                        <p class="mt-2">Loading info pages...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Info Page Editor Modal -->
        <div id="infoPageModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 overflow-y-auto">
            <div class="min-h-screen px-4 flex items-center justify-center">
                <div class="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                        <h3 class="text-2xl font-bold" id="infoPageModalTitle">
                            <i class="fas fa-file-alt mr-2"></i>Create Info Page
                        </h3>
                        <button onclick="closeInfoPageModal()" class="text-white hover:text-gray-200">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6 max-h-[70vh] overflow-y-auto">
                        <form id="infoPageForm" class="space-y-6">
                            <input type="hidden" id="infoPageId" />
                            
                            <!-- Basic Info -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-sm font-bold mb-2">
                                        <i class="fas fa-heading mr-1 text-purple-600"></i>Page Title (English) *
                                    </label>
                                    <input type="text" id="infoPageTitle" required 
                                           class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                           placeholder="e.g., Room Phone Extensions">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-bold mb-2">
                                        <i class="fas fa-key mr-1 text-purple-600"></i>Page Key
                                    </label>
                                    <input type="text" id="infoPageKey" 
                                           class="w-full p-3 border rounded-lg bg-gray-50"
                                           placeholder="Auto-generated" readonly>
                                    <p class="text-xs text-gray-500 mt-1">Used in URL (auto-generated from title)</p>
                                </div>
                            </div>

                            <!-- Visual Settings -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label class="block text-sm font-bold mb-2">
                                        <i class="fas fa-icons mr-1 text-purple-600"></i>Icon
                                    </label>
                                    <select id="infoPageIcon" class="w-full p-3 border rounded-lg">
                                        <option value="fas fa-info-circle">ℹ️ Info</option>
                                        <option value="fas fa-phone">📞 Phone</option>
                                        <option value="fas fa-wifi">📶 WiFi</option>
                                        <option value="fas fa-utensils">🍽️ Dining</option>
                                        <option value="fas fa-clock">🕐 Hours</option>
                                        <option value="fas fa-parking">🅿️ Parking</option>
                                        <option value="fas fa-swimming-pool">🏊 Pool</option>
                                        <option value="fas fa-dumbbell">💪 Gym</option>
                                        <option value="fas fa-spa">💆 Spa</option>
                                        <option value="fas fa-concierge-bell">🛎️ Concierge</option>
                                        <option value="fas fa-hotel">🏨 Hotel</option>
                                        <option value="fas fa-shield-alt">🛡️ Policy</option>
                                        <option value="fas fa-map-marked-alt">🗺️ Map</option>
                                        <option value="fas fa-question-circle">❓ FAQ</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-bold mb-2">
                                        <i class="fas fa-palette mr-1 text-purple-600"></i>Color Theme
                                    </label>
                                    <select id="infoPageColor" class="w-full p-3 border rounded-lg">
                                        <option value="blue">🔵 Blue</option>
                                        <option value="purple">🟣 Purple</option>
                                        <option value="green">🟢 Green</option>
                                        <option value="orange">🟠 Orange</option>
                                        <option value="red">🔴 Red</option>
                                        <option value="pink">🩷 Pink</option>
                                        <option value="indigo">🟣 Indigo</option>
                                        <option value="teal">🔷 Teal</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-bold mb-2">
                                        <i class="fas fa-columns mr-1 text-purple-600"></i>Layout
                                    </label>
                                    <select id="infoPageLayout" class="w-full p-3 border rounded-lg">
                                        <option value="single-column">Single Column</option>
                                        <option value="two-column">Two Columns</option>
                                        <option value="card-grid">Card Grid</option>
                                        <option value="table">Table</option>
                                        <option value="accordion">Accordion</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Rich Content Editor -->
                            <div>
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fas fa-edit mr-1 text-purple-600"></i>Page Content *
                                </label>
                                
                                <!-- Formatting Toolbar -->
                                <div class="bg-gray-100 p-3 rounded-t-lg border border-b-0 flex flex-wrap gap-2">
                                    <button type="button" onclick="formatText('bold')" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Bold">
                                        <i class="fas fa-bold"></i>
                                    </button>
                                    <button type="button" onclick="formatText('italic')" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Italic">
                                        <i class="fas fa-italic"></i>
                                    </button>
                                    <button type="button" onclick="formatText('underline')" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Underline">
                                        <i class="fas fa-underline"></i>
                                    </button>
                                    <span class="border-r mx-1"></span>
                                    <button type="button" onclick="formatText('h2')" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Heading 2">
                                        <strong>H2</strong>
                                    </button>
                                    <button type="button" onclick="formatText('h3')" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Heading 3">
                                        <strong>H3</strong>
                                    </button>
                                    <span class="border-r mx-1"></span>
                                    <button type="button" onclick="formatText('ul')" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Bullet List">
                                        <i class="fas fa-list-ul"></i>
                                    </button>
                                    <button type="button" onclick="formatText('ol')" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Numbered List">
                                        <i class="fas fa-list-ol"></i>
                                    </button>
                                    <span class="border-r mx-1"></span>
                                    <button type="button" onclick="insertTable()" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Insert Table">
                                        <i class="fas fa-table"></i>
                                    </button>
                                    <button type="button" onclick="insertCallout('info')" class="px-3 py-1 bg-blue-100 border rounded hover:bg-blue-200" title="Info Box">
                                        <i class="fas fa-info-circle text-blue-600"></i>
                                    </button>
                                    <button type="button" onclick="insertCallout('warning')" class="px-3 py-1 bg-yellow-100 border rounded hover:bg-yellow-200" title="Warning Box">
                                        <i class="fas fa-exclamation-triangle text-yellow-600"></i>
                                    </button>
                                    <button type="button" onclick="insertCallout('success')" class="px-3 py-1 bg-green-100 border rounded hover:bg-green-200" title="Success Box">
                                        <i class="fas fa-check-circle text-green-600"></i>
                                    </button>
                                    <span class="border-r mx-1"></span>
                                    <button type="button" onclick="insertDivider()" class="px-3 py-1 bg-white border rounded hover:bg-gray-50" title="Divider">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                </div>

                                <!-- Content Textarea -->
                                <textarea id="infoPageContent" rows="15" required
                                          class="w-full p-4 border rounded-b-lg font-mono text-sm focus:ring-2 focus:ring-purple-500"
                                          placeholder="Enter your content here... You can use HTML or plain text.&#10;&#10;Use the toolbar above to format your content."></textarea>
                                
                                <div class="mt-2 flex justify-between items-center">
                                    <p class="text-xs text-gray-500">
                                        <i class="fas fa-lightbulb text-yellow-500 mr-1"></i>
                                        Tip: Use the toolbar to add formatting, tables, and callout boxes!
                                    </p>
                                    <button type="button" onclick="previewContent()" class="text-purple-600 hover:text-purple-800 text-sm font-semibold">
                                        <i class="fas fa-eye mr-1"></i>Preview
                                    </button>
                                </div>
                            </div>

                            <!-- Publish Settings -->
                            <div class="flex gap-6">
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="infoPagePublished" checked class="mr-2 w-5 h-5 text-purple-600">
                                    <span class="font-semibold"><i class="fas fa-globe mr-1 text-purple-600"></i>Published (visible to guests)</span>
                                </label>
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="infoPageShowMenu" checked class="mr-2 w-5 h-5 text-purple-600">
                                    <span class="font-semibold"><i class="fas fa-bars mr-1 text-purple-600"></i>Show in Info Menu</span>
                                </label>
                            </div>
                        </form>
                    </div>

                    <!-- Modal Footer -->
                    <div class="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
                        <button onclick="closeInfoPageModal()" class="px-6 py-3 border rounded-lg hover:bg-gray-100 font-semibold">
                            <i class="fas fa-times mr-2"></i>Cancel
                        </button>
                        <button onclick="saveInfoPage()" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
                            <i class="fas fa-save mr-2"></i>Save Page
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Activities Tab -->
        <div id="activitiesTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">All Activities</h2>
                <div id="activitiesList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Callbacks Tab -->
        <div id="callbacksTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4"><i class="fas fa-phone mr-2 text-orange-600"></i>Callback Requests</h2>
                <div id="callbacksList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Settings Tab -->
        <div id="settingsTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-4 md:p-6">
                <h2 class="text-xl md:text-2xl font-bold mb-4 md:mb-6"><i class="fas fa-cog mr-2 text-purple-600"></i>Hotel Design Settings</h2>
                
                <!-- Hotel Homepage Link -->
                <div class="mb-6 md:mb-8 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 class="text-base md:text-lg font-semibold mb-2 text-blue-800"><i class="fas fa-link mr-2"></i>Your Hotel Homepage</h3>
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4">
                        <input type="text" id="homepageUrl" readonly class="flex-1 px-3 md:px-4 py-2 border rounded-lg bg-white font-mono text-xs md:text-sm" />
                        <button onclick="copyHomepageUrl()" class="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base whitespace-nowrap">
                            <i class="fas fa-copy mr-2"></i><span class="hidden sm:inline">Copy Link</span><span class="sm:hidden">Copy</span>
                        </button>
                        <a id="visitHomepage" href="#" target="_blank" class="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center text-sm md:text-base whitespace-nowrap">
                            <i class="fas fa-external-link-alt mr-2"></i><span class="hidden sm:inline">Visit</span><span class="sm:hidden">Open</span>
                        </a>
                    </div>
                </div>

                <form id="settingsForm" class="space-y-6">
                    <!-- Basic Information Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-hotel mr-2"></i>Basic Information</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium mb-2">Hotel Name</label>
                                <input type="text" id="hotelName" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Paradise Resort & Spa" required />
                                <p class="text-xs text-gray-500 mt-1">This name appears on your homepage and everywhere</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Tagline / Slogan</label>
                                <input type="text" id="hotelTagline" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Discover all we have to offer" />
                                <p class="text-xs text-gray-500 mt-1">Appears below hotel name on hero</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Contact Email</label>
                                <input type="email" id="hotelEmail" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="info@hotel.com" />
                                <p class="text-xs text-gray-500 mt-1">Displayed in footer</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Contact Phone</label>
                                <input type="tel" id="hotelPhone" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+1 234 567 8900" />
                                <p class="text-xs text-gray-500 mt-1">Displayed in footer</p>
                            </div>
                            
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium mb-2">Address</label>
                                <input type="text" id="hotelAddress" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="123 Beach Road, Paradise City" />
                                <p class="text-xs text-gray-500 mt-1">Full hotel address</p>
                            </div>
                        </div>
                    </div>

                    <!-- Branding Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-palette mr-2"></i>Visual Branding</h3>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Hotel Logo URL</label>
                                <input type="url" id="brandLogoUrl" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/logo.png" />
                                <p class="text-xs text-gray-500 mt-1">Recommended: PNG or SVG, transparent background, max height 80px</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Hero Background Image URL</label>
                                <input type="url" id="heroImageUrl" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/hero.jpg" />
                                <p class="text-xs text-gray-500 mt-1">Recommended: 1920x600px, high quality, landscape orientation</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Hero Image Effect</label>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="none" class="peer sr-only" checked />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-blue-400 to-green-400 rounded mb-2"></div>
                                            <span class="text-xs font-medium">Original</span>
                                        </div>
                                    </label>
                                    
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="grayscale" class="peer sr-only" />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded mb-2"></div>
                                            <span class="text-xs font-medium">Grayscale</span>
                                        </div>
                                    </label>
                                    
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="sepia" class="peer sr-only" />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-yellow-700 to-orange-600 rounded mb-2"></div>
                                            <span class="text-xs font-medium">Sepia</span>
                                        </div>
                                    </label>
                                    
                                    <label class="cursor-pointer">
                                        <input type="radio" name="heroImageEffect" value="blur" class="peer sr-only" />
                                        <div class="border-2 border-gray-300 rounded-lg p-3 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                            <div class="w-full h-12 bg-gradient-to-r from-blue-300 to-purple-300 rounded mb-2 opacity-60"></div>
                                            <span class="text-xs font-medium">Blur</span>
                                        </div>
                                    </label>
                                </div>
                                <p class="text-xs text-gray-500 mt-2">Choose how your hero background image appears</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Hero Overlay Opacity</label>
                                <div class="flex items-center gap-4">
                                    <input type="range" id="heroOverlayOpacity" min="0" max="100" value="30" class="flex-1" />
                                    <span id="heroOverlayValue" class="text-sm font-medium w-12 text-center">30%</span>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Dark overlay to improve text readability (0% = no overlay, 100% = completely dark)</p>
                            </div>
                        </div>
                    </div>

                    <!-- Colors Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-fill-drip mr-2"></i>Color Scheme</h3>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Primary Color</label>
                                <div class="flex gap-2 mb-2">
                                    <input type="color" id="primaryColor" class="w-16 h-10 border rounded cursor-pointer" />
                                    <input type="text" id="primaryColorText" class="flex-1 px-4 py-2 border rounded-lg font-mono text-sm" placeholder="#3B82F6" />
                                </div>
                                <label class="flex items-center text-sm text-gray-600 cursor-pointer">
                                    <input type="checkbox" id="primaryGradient" class="mr-2" />
                                    <span>Use gradient (Primary → Secondary)</span>
                                </label>
                                <div id="primaryGradientPreview" class="hidden mt-2 h-8 rounded-lg" style="background: linear-gradient(135deg, #3B82F6, #10B981);"></div>
                                <p class="text-xs text-gray-500 mt-1">Main brand color (headers, buttons)</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Secondary Color</label>
                                <div class="flex gap-2 mb-2">
                                    <input type="color" id="secondaryColor" class="w-16 h-10 border rounded cursor-pointer" />
                                    <input type="text" id="secondaryColorText" class="flex-1 px-4 py-2 border rounded-lg font-mono text-sm" placeholder="#10B981" />
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Secondary elements & gradient partner</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Accent Color</label>
                                <div class="flex gap-2 mb-2">
                                    <input type="color" id="accentColor" class="w-16 h-10 border rounded cursor-pointer" />
                                    <input type="text" id="accentColorText" class="flex-1 px-4 py-2 border rounded-lg font-mono text-sm" placeholder="#F59E0B" />
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Highlights and badges</p>
                            </div>
                        </div>
                    </div>

                    <!-- Layout Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-th-large mr-2"></i>Layout Style</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="layoutStyle" value="modern" class="peer sr-only" />
                                <div class="border-2 border-gray-300 rounded-lg p-4 peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                    <div class="text-center mb-3">
                                        <i class="fas fa-layer-group text-3xl mb-2 text-blue-600"></i>
                                        <h4 class="font-semibold">Modern</h4>
                                        <p class="text-xs text-gray-500 mt-1">Clean cards with shadows</p>
                                    </div>
                                    <!-- Mini Preview -->
                                    <div class="bg-gray-100 p-3 rounded space-y-2">
                                        <div class="bg-white rounded-xl shadow-md p-2 h-16"></div>
                                        <div class="bg-white rounded-xl shadow-md p-2 h-12"></div>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="layoutStyle" value="elegant" class="peer sr-only" />
                                <div class="border-2 border-gray-300 rounded-lg p-4 peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                    <div class="text-center mb-3">
                                        <i class="fas fa-gem text-3xl mb-2 text-purple-600"></i>
                                        <h4 class="font-semibold">Elegant</h4>
                                        <p class="text-xs text-gray-500 mt-1">Luxury with borders</p>
                                    </div>
                                    <!-- Mini Preview -->
                                    <div class="bg-gray-100 p-3 rounded space-y-2">
                                        <div class="bg-white rounded-sm border-2 border-gray-300 p-2 h-16"></div>
                                        <div class="bg-white rounded-sm border-2 border-gray-300 p-2 h-12"></div>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="layoutStyle" value="minimal" class="peer sr-only" />
                                <div class="border-2 border-gray-300 rounded-lg p-4 peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-400 transition">
                                    <div class="text-center mb-3">
                                        <i class="fas fa-minus text-3xl mb-2 text-gray-600"></i>
                                        <h4 class="font-semibold">Minimal</h4>
                                        <p class="text-xs text-gray-500 mt-1">Simple and flat</p>
                                    </div>
                                    <!-- Mini Preview -->
                                    <div class="bg-gray-100 p-3 rounded space-y-2">
                                        <div class="bg-white rounded-md p-2 h-16 border border-gray-200"></div>
                                        <div class="bg-white rounded-md p-2 h-12 border border-gray-200"></div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Typography Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-font mr-2"></i>Typography</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Font Family</label>
                                <select id="fontFamily" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="inter">Inter (Modern Sans)</option>
                                    <option value="poppins">Poppins (Geometric)</option>
                                    <option value="playfair">Playfair Display (Elegant Serif)</option>
                                    <option value="montserrat">Montserrat (Bold Sans)</option>
                                    <option value="lora">Lora (Classic Serif)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Button Style</label>
                                <select id="buttonStyle" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="rounded">Rounded</option>
                                    <option value="square">Square</option>
                                    <option value="pill">Pill (Fully Rounded)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- UI Elements Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-cube mr-2"></i>UI Elements</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">Card Style</label>
                                <select id="cardStyle" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="shadow">Shadow</option>
                                    <option value="border">Border Only</option>
                                    <option value="elevated">Elevated</option>
                                    <option value="flat">Flat</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">Header Style</label>
                                <select id="headerStyle" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="transparent">Transparent Overlay</option>
                                    <option value="solid">Solid Background</option>
                                    <option value="gradient">Gradient</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Homepage Layout Control Section -->
                    <div class="border-b pb-6">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-th-list mr-2"></i>Homepage Layout Control</h3>
                        <p class="text-sm text-gray-600 mb-4">Control what appears on your homepage and in what order</p>
                        
                        <!-- Hotel Map -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h4 class="font-semibold mb-3 text-gray-800"><i class="fas fa-map mr-2 text-blue-600"></i>Hotel/Resort Map</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium mb-2">Hotel Map Image URL</label>
                                    <input type="url" id="hotelMapUrl" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/hotel-map.jpg" />
                                    <p class="text-xs text-gray-500 mt-1">Upload your hotel/resort map (floor plan, grounds map, etc.)</p>
                                </div>
                                
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="showHotelMap" class="mr-2 w-4 h-4" />
                                    <span class="text-sm font-medium">Enable Hotel Map (Floating Button)</span>
                                </label>
                                <p class="text-xs text-gray-500 ml-6">When enabled, a convenient floating "Hotel Map" button appears in the bottom-right corner</p>
                            </div>
                        </div>
                        
                        <!-- Section Names (Customization) -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h4 class="font-semibold mb-3 text-gray-800"><i class="fas fa-i-cursor mr-2 text-blue-600"></i>Section Names (Customize Labels)</h4>
                            <p class="text-xs text-gray-500 mb-3">Rename default sections to match your brand (appears on guest homepage)</p>
                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium mb-1">🍽️ Restaurants Section Name</label>
                                    <input type="text" id="sectionNameRestaurants" placeholder="e.g., Dining Options" class="w-full px-3 py-2 border rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">🎉 Events Section Name</label>
                                    <input type="text" id="sectionNameEvents" placeholder="e.g., Special Events" class="w-full px-3 py-2 border rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">💆 Spa Section Name</label>
                                    <input type="text" id="sectionNameSpa" placeholder="e.g., Wellness Center" class="w-full px-3 py-2 border rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">🛎️ Services Section Name</label>
                                    <input type="text" id="sectionNameService" placeholder="e.g., Hotel Amenities" class="w-full px-3 py-2 border rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">🏃 Activities Section Name</label>
                                    <input type="text" id="sectionNameActivities" placeholder="e.g., Things To Do" class="w-full px-3 py-2 border rounded-lg text-sm">
                                </div>
                            </div>
                            <p class="text-xs text-gray-400 mt-2"><i class="fas fa-info-circle mr-1"></i>Leave blank to use default names. Changes apply to English version only.</p>
                        </div>
                        
                        <!-- Section Visibility -->
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                            <h4 class="font-semibold mb-3 text-gray-800"><i class="fas fa-eye mr-2 text-green-600"></i>Section Visibility</h4>
                            <p class="text-xs text-gray-500 mb-3">Toggle which sections appear on your homepage</p>
                            <div id="sectionVisibilityGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                <!-- Will be populated dynamically with default + custom sections -->
                            </div>
                        </div>
                        
                        <!-- Section Order -->
                        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 class="font-semibold mb-3 text-gray-800"><i class="fas fa-sort mr-2 text-purple-600"></i>Section Order</h4>
                            <p class="text-xs text-gray-500 mb-3">Drag to reorder how sections appear on your homepage</p>
                            <div id="sectionOrderList" class="space-y-2">
                                <!-- Will be populated dynamically -->
                            </div>
                            <p class="text-xs text-gray-400 mt-3"><i class="fas fa-info-circle mr-1"></i>Drag sections up/down to change their display order</p>
                        </div>
                    </div>

                    <!-- Preview & Save -->
                    <div class="flex gap-4">
                        <button type="button" onclick="previewDesign()" class="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold">
                            <i class="fas fa-eye mr-2"></i>Preview Changes
                        </button>
                        <button type="submit" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                            <i class="fas fa-save mr-2"></i>Save Design Settings
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Seasonal Effects Section (inside Settings) -->
            <div class="bg-white rounded-lg shadow-lg p-6 mt-6">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-6"><i class="fas fa-snowflake mr-2 text-blue-600"></i>Seasonal Effects & Decorations</h2>
                <p class="text-gray-600 mb-6">Add festive effects and decorations to delight your guests during special occasions!</p>
                
                <form id="seasonalForm" class="space-y-6">
                    <!-- Theme Selection -->
                    <div class="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-purple-50">
                        <h3 class="font-bold text-lg mb-4 flex items-center text-purple-800">
                            <i class="fas fa-palette mr-2"></i>Choose Theme
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="none" class="hidden theme-radio" checked>
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-ban text-3xl mb-2 text-gray-500"></i>
                                    <div class="font-semibold">None</div>
                                    <div class="text-xs text-gray-500">No effects</div>
                                </div>
                            </label>
                            
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="christmas" class="hidden theme-radio">
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-tree text-3xl mb-2 text-green-600"></i>
                                    <div class="font-semibold">Christmas</div>
                                    <div class="text-xs text-gray-500">Snow & decorations</div>
                                </div>
                            </label>
                            
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="newyear" class="hidden theme-radio">
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-champagne-glasses text-3xl mb-2 text-yellow-600"></i>
                                    <div class="font-semibold">New Year</div>
                                    <div class="text-xs text-gray-500">Fireworks & confetti</div>
                                </div>
                            </label>
                            
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="easter" class="hidden theme-radio">
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-egg text-3xl mb-2 text-pink-600"></i>
                                    <div class="font-semibold">Easter</div>
                                    <div class="text-xs text-gray-500">Spring colors</div>
                                </div>
                            </label>
                            
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="ramadan" class="hidden theme-radio">
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-moon text-3xl mb-2 text-indigo-600"></i>
                                    <div class="font-semibold">Ramadan</div>
                                    <div class="text-xs text-gray-500">Lanterns & stars</div>
                                </div>
                            </label>
                            
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="eid" class="hidden theme-radio">
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-star-and-crescent text-3xl mb-2 text-green-700"></i>
                                    <div class="font-semibold">Eid</div>
                                    <div class="text-xs text-gray-500">Celebration mode</div>
                                </div>
                            </label>
                            
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="halloween" class="hidden theme-radio">
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-ghost text-3xl mb-2 text-orange-600"></i>
                                    <div class="font-semibold">Halloween</div>
                                    <div class="text-xs text-gray-500">Spooky vibes</div>
                                </div>
                            </label>
                            
                            <label class="theme-option cursor-pointer">
                                <input type="radio" name="theme" value="valentines" class="hidden theme-radio">
                                <div class="theme-card border-2 rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <i class="fas fa-heart text-3xl mb-2 text-red-600"></i>
                                    <div class="font-semibold">Valentine's</div>
                                    <div class="text-xs text-gray-500">Hearts & love</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Effects Toggle -->
                    <div class="border rounded-lg p-6 bg-gray-50">
                        <h3 class="font-bold text-lg mb-4"><i class="fas fa-magic mr-2 text-purple-600"></i>Visual Effects</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label class="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                                <input type="checkbox" id="enableSnow" class="mr-3 w-5 h-5 text-blue-600">
                                <div class="flex-1">
                                    <div class="font-semibold"><i class="fas fa-snowflake mr-2 text-blue-400"></i>Snow Effect</div>
                                    <div class="text-xs text-gray-500">Falling snowflakes animation</div>
                                </div>
                            </label>
                            
                            <label class="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                                <input type="checkbox" id="enableFireworks" class="mr-3 w-5 h-5 text-blue-600">
                                <div class="flex-1">
                                    <div class="font-semibold"><i class="fas fa-burst mr-2 text-yellow-500"></i>Fireworks</div>
                                    <div class="text-xs text-gray-500">Celebration fireworks</div>
                                </div>
                            </label>
                            
                            <label class="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                                <input type="checkbox" id="enableConfetti" class="mr-3 w-5 h-5 text-blue-600">
                                <div class="flex-1">
                                    <div class="font-semibold"><i class="fas fa-wand-magic-sparkles mr-2 text-purple-500"></i>Confetti</div>
                                    <div class="text-xs text-gray-500">Colorful confetti rain</div>
                                </div>
                            </label>
                            
                            <label class="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                                <input type="checkbox" id="enableLights" class="mr-3 w-5 h-5 text-blue-600">
                                <div class="flex-1">
                                    <div class="font-semibold"><i class="fas fa-lightbulb mr-2 text-yellow-400"></i>Festive Lights</div>
                                    <div class="text-xs text-gray-500">Twinkling string lights</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Custom Message -->
                    <div class="border rounded-lg p-6">
                        <h3 class="font-bold text-lg mb-4"><i class="fas fa-comment-dots mr-2 text-green-600"></i>Custom Greeting Message</h3>
                        <input type="text" id="customMessage" placeholder="e.g., Merry Christmas! 🎄 or Happy Eid! 🌙" class="w-full px-4 py-3 border rounded-lg text-lg">
                        <p class="text-xs text-gray-500 mt-2">This message will appear prominently on your hotel page</p>
                    </div>
                    
                    <!-- Profile Overlay -->
                    <div class="border rounded-lg p-6 bg-gradient-to-r from-orange-50 to-pink-50">
                        <h3 class="font-bold text-lg mb-4"><i class="fas fa-hat-wizard mr-2 text-orange-600"></i>Fun Profile Overlays</h3>
                        <label class="flex items-center mb-3">
                            <input type="checkbox" id="enableOverlay" class="mr-3 w-5 h-5">
                            <span class="font-medium">Enable overlay decorations</span>
                        </label>
                        <div id="overlayOptions" class="hidden grid grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                            <label class="overlay-choice cursor-pointer">
                                <input type="radio" name="overlay" value="santa_hat" class="hidden">
                                <div class="border-2 rounded-lg p-3 text-center hover:shadow-lg transition">
                                    <div class="text-2xl mb-1">🎅</div>
                                    <div class="text-xs">Santa Hat</div>
                                </div>
                            </label>
                            <label class="overlay-choice cursor-pointer">
                                <input type="radio" name="overlay" value="party_hat" class="hidden">
                                <div class="border-2 rounded-lg p-3 text-center hover:shadow-lg transition">
                                    <div class="text-2xl mb-1">🎉</div>
                                    <div class="text-xs">Party Hat</div>
                                </div>
                            </label>
                            <label class="overlay-choice cursor-pointer">
                                <input type="radio" name="overlay" value="bunny_ears" class="hidden">
                                <div class="border-2 rounded-lg p-3 text-center hover:shadow-lg transition">
                                    <div class="text-2xl mb-1">🐰</div>
                                    <div class="text-xs">Bunny Ears</div>
                                </div>
                            </label>
                            <label class="overlay-choice cursor-pointer">
                                <input type="radio" name="overlay" value="crown" class="hidden">
                                <div class="border-2 rounded-lg p-3 text-center hover:shadow-lg transition">
                                    <div class="text-2xl mb-1">👑</div>
                                    <div class="text-xs">Crown</div>
                                </div>
                            </label>
                            <label class="overlay-choice cursor-pointer">
                                <input type="radio" name="overlay" value="halo" class="hidden">
                                <div class="border-2 rounded-lg p-3 text-center hover:shadow-lg transition">
                                    <div class="text-2xl mb-1">😇</div>
                                    <div class="text-xs">Halo</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Preview & Actions -->
                    <div class="flex justify-between items-center pt-4 border-t">
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" id="isActive" class="mr-2 w-5 h-5 text-green-600">
                                <span class="font-semibold text-lg">🎯 Activate Effects Now</span>
                            </label>
                            <p class="text-xs text-gray-500 ml-7">Turn on/off all seasonal effects</p>
                        </div>
                        <div class="flex gap-3">
                            <button type="button" onclick="previewSeasonalEffects()" class="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold">
                                <i class="fas fa-eye mr-2"></i>Preview
                            </button>
                            <button type="submit" class="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-semibold">
                                <i class="fas fa-save mr-2"></i>Save Settings
                            </button>
                        </div>
                    </div>
                </form>
                
                <!-- Quick Presets -->
                <div class="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                    <h3 class="font-bold mb-3"><i class="fas fa-bolt mr-2 text-yellow-500"></i>Quick Presets</h3>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="applyPreset('christmas')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            🎄 Christmas Mode
                        </button>
                        <button onclick="applyPreset('newyear')" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                            🎆 New Year Mode
                        </button>
                        <button onclick="applyPreset('ramadan')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            🌙 Ramadan Mode
                        </button>
                        <button onclick="applyPreset('eid')" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                            ⭐ Eid Mode
                        </button>
                        <button onclick="applyPreset('none')" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                            🚫 Clear All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

        <!-- AI Chatbot Tab -->
        <div id="chatbotTab" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-4">
                    <i class="fas fa-robot mr-2 text-purple-600"></i>
                    AI Chatbot - Knowledge Base Management
                </h2>
                <p class="text-gray-600 mb-6">
                    Create a smart AI assistant that answers guest questions using your hotel's information. Upload FAQs, policies, and amenities details.
                </p>

                <!-- Chatbot Settings -->
                <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
                    <h3 class="text-xl font-bold mb-4"><i class="fas fa-cog mr-2"></i>Chatbot Settings</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" id="chatbotEnabled" class="w-5 h-5 rounded">
                                <span class="font-medium">Enable AI Chatbot</span>
                            </label>
                            <p class="text-sm text-gray-600 ml-8 mt-1">Show chat widget on guest page</p>
                        </div>
                        <div>
                            <label class="block font-medium mb-2">Chatbot Name</label>
                            <input type="text" id="chatbotName" placeholder="e.g., Paradise Assistant" class="w-full px-4 py-2 border rounded-lg">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block font-medium mb-2">Greeting Message</label>
                            <textarea id="chatbotGreeting" rows="2" placeholder="Welcome message for guests..." class="w-full px-4 py-2 border rounded-lg"></textarea>
                        </div>
                    </div>
                    <button onclick="saveChatbotSettings()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-save mr-2"></i>Save Settings
                    </button>
                </div>

                <!-- Add New Document -->
                <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
                    <h3 class="text-xl font-bold mb-4"><i class="fas fa-file-upload mr-2 text-green-600"></i>Add Knowledge Document</h3>
                    <form id="addDocumentForm" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block font-medium mb-2">Document Title *</label>
                                <input type="text" id="docTitle" required placeholder="e.g., Check-in & Check-out Policy" class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block font-medium mb-2">Category</label>
                                <select id="docType" class="w-full px-4 py-2 border rounded-lg">
                                    <option value="faq">FAQ</option>
                                    <option value="policy">Policy</option>
                                    <option value="amenity">Amenity Info</option>
                                    <option value="general">General Info</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block font-medium mb-2">Content *</label>
                            <textarea id="docContent" required rows="6" placeholder="Enter detailed information that guests might ask about..." class="w-full px-4 py-2 border rounded-lg"></textarea>
                            <p class="text-sm text-gray-500 mt-2">
                                <i class="fas fa-lightbulb text-yellow-500 mr-1"></i>
                                Tip: Be specific and detailed. Include times, prices, locations, and procedures. The AI will use this to answer questions accurately.
                            </p>
                        </div>
                        <button type="submit" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold">
                            <i class="fas fa-plus mr-2"></i>Add Document & Create Chunks
                        </button>
                    </form>
                </div>

                <!-- Documents List -->
                <div class="bg-white rounded-lg border p-6">
                    <h3 class="text-xl font-bold mb-4"><i class="fas fa-database mr-2 text-blue-600"></i>Knowledge Base Documents</h3>
                    <div id="documentsList" class="space-y-3">
                        <p class="text-gray-500 text-center py-8">
                            <i class="fas fa-spinner fa-spin mr-2"></i>Loading documents...
                        </p>
                    </div>
                </div>
            </div>
        </div>

    <!-- Support Ticket Modal -->
    <div id="supportModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold"><i class="fas fa-ticket-alt mr-2 text-orange-600"></i>Create Support Ticket</h3>
                <button onclick="closeSupportModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <form id="supportTicketForm" class="space-y-4">
                <div>
                    <label class="block font-medium mb-2">Subject *</label>
                    <input type="text" id="ticketSubject" required class="w-full px-4 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block font-medium mb-2">Category</label>
                    <select id="ticketCategory" class="w-full px-4 py-2 border rounded-lg">
                        <option value="general">General Inquiry</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing Question</option>
                        <option value="feature_request">Feature Request</option>
                        <option value="bug_report">Bug Report</option>
                    </select>
                </div>
                <div>
                    <label class="block font-medium mb-2">Priority</label>
                    <select id="ticketPriority" class="w-full px-4 py-2 border rounded-lg">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <div>
                    <label class="block font-medium mb-2">Description *</label>
                    <textarea id="ticketDescription" required class="w-full px-4 py-2 border rounded-lg" rows="5" placeholder="Please describe your issue or question in detail..."></textarea>
                </div>
                <div class="flex justify-end gap-3">
                    <button type="button" onclick="closeSupportModal()" class="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                    <button type="submit" class="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">
                        <i class="fas fa-paper-plane mr-2"></i>Submit Ticket
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Live Chat Widget -->
    <div id="chatWidget" class="hidden fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50">
        <div class="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl flex justify-between items-center">
            <div>
                <h4 class="font-bold"><i class="fas fa-comments mr-2"></i>Live Support Chat</h4>
                <p class="text-xs text-blue-100">We're here to help!</p>
            </div>
            <button onclick="closeLiveChat()" class="text-white/80 hover:text-white">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4" id="widgetChatMessages" style="max-height: 360px;">
            <div class="text-center text-gray-500 text-sm">Starting chat...</div>
        </div>
        <div class="p-3 border-t">
            <div class="flex gap-2">
                <input type="text" id="widgetChatInput" placeholder="Type your message..." class="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <button onclick="sendWidgetMessage()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>

    <script>
      const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
      if (!user.user_id) { window.location.href = '/admin/login'; }

      let currentTab = 'rooms';
      
      function showTab(tab, clickedButton) {
        currentTab = tab;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
        document.getElementById(tab + 'Tab').classList.remove('hidden');
        if (clickedButton) {
          clickedButton.classList.add('tab-active');
        }
        
        if (tab === 'qrcode') loadQRCode();
        if (tab === 'analytics') loadAnalytics();
        if (tab === 'rooms') loadRooms();
        if (tab === 'vendors') loadVendors();
        if (tab === 'regcode') loadRegCode();
        if (tab === 'offerings') loadOfferings();
        if (tab === 'customsections') loadCustomSections();
        if (tab === 'infopages') loadInfoPages();
        if (tab === 'activities') loadActivities();
        if (tab === 'callbacks') loadCallbacks();
        if (tab === 'settings') loadSettings();
        if (tab === 'chatbot') loadChatbot();
      }
      
      // Add event listeners to tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const tab = this.getAttribute('data-tab');
          showTab(tab, this);
        });
      });
      
      // QR Code functions
      async function loadQRCode() {
        try {
          const response = await fetch('/api/properties');
          const data = await response.json();
          const property = data.properties[0];
          
          if (property) {
            const hotelURL = window.location.origin + '/hotel/' + property.slug;
            document.getElementById('hotelURL').textContent = hotelURL;
            document.getElementById('propertyName').textContent = property.name;
            document.getElementById('propertySlug').textContent = property.slug;
            
            // Generate QR code using QR Code API
            const qrURL = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(hotelURL);
            document.getElementById('qrCodeDisplay').innerHTML = '<img src="' + qrURL + '" alt="QR Code" class="w-64 h-64">';
          }
        } catch (error) {
          console.error('QR Code load error:', error);
          document.getElementById('qrCodeDisplay').innerHTML = '<div class="text-red-500"><i class="fas fa-exclamation-triangle"></i><p>Error loading QR code</p></div>';
        }
      }
      
      window.downloadQR = function() {
        const hotelURL = document.getElementById('hotelURL').textContent;
        const qrURL = 'https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=png&data=' + encodeURIComponent(hotelURL);
        const a = document.createElement('a');
        a.href = qrURL;
        a.download = 'hotel-qr-code.png';
        a.click();
      }
      
      window.printQR = function() {
        const qrImg = document.querySelector('#qrCodeDisplay img');
        if (qrImg) {
          const win = window.open('', '_blank');
          win.document.write('<html><head><title>Print QR Code</title></head><body style="text-align:center;padding:50px;">');
          win.document.write('<h1>' + document.getElementById('propertyName').textContent + '</h1>');
          win.document.write('<img src="' + qrImg.src + '" style="width:500px;height:500px;">');
          win.document.write('<p>' + document.getElementById('hotelURL').textContent + '</p>');
          win.document.write('</body></html>');
          win.document.close();
          win.print();
        }
      }
      
      // QR Card Designer Functions
      let currentFestiveOverlay = null;
      let qrCardConfig = {
        title: 'Scan for Hotel Services',
        subtitle: 'Access all amenities and services',
        message: '',
        bgColor: '#ffffff',
        textColor: '#000000',
        qrSize: 300,
        borderRadius: 10,
        festiveOverlay: null
      };

      // Festive overlay emojis mapping
      const festiveOverlays = {
        christmas: '🎅',
        newyear: '🎊',
        easter: '🐰',
        ramadan: '🌙',
        eid: '🕌',
        halloween: '🎃',
        valentine: '💝'
      };

      // Load QR card template from database
      async function loadQRCardTemplate() {
        try {
          const response = await fetch('/api/admin/qr-card/1');
          const data = await response.json();
          
          // Update form fields
          document.getElementById('cardTitle').value = data.card_title || qrCardConfig.title;
          document.getElementById('cardSubtitle').value = data.card_subtitle || qrCardConfig.subtitle;
          document.getElementById('cardMessage').value = data.custom_message || '';
          document.getElementById('bgColor').value = data.background_color || qrCardConfig.bgColor;
          document.getElementById('textColor').value = data.text_color || qrCardConfig.textColor;
          document.getElementById('qrSize').value = data.qr_size || qrCardConfig.qrSize;
          document.getElementById('borderRadius').value = data.border_radius || qrCardConfig.borderRadius;
          
          // Update config
          qrCardConfig = {
            title: data.card_title || qrCardConfig.title,
            subtitle: data.card_subtitle || qrCardConfig.subtitle,
            message: data.custom_message || '',
            bgColor: data.background_color || qrCardConfig.bgColor,
            textColor: data.text_color || qrCardConfig.textColor,
            qrSize: data.qr_size || qrCardConfig.qrSize,
            borderRadius: data.border_radius || qrCardConfig.borderRadius,
            festiveOverlay: data.festive_overlay
          };
          
          currentFestiveOverlay = data.festive_overlay;
          
          // Highlight active festive button
          if (currentFestiveOverlay) {
            setFestiveOverlay(currentFestiveOverlay);
          }
          
          updateQRCardPreview();
        } catch (error) {
          console.error('Load QR card error:', error);
        }
      }

      // Update QR card preview in real-time
      function updateQRCardPreview() {
        const hotelURL = document.getElementById('hotelURL').textContent;
        const propertyName = document.getElementById('propertyName').textContent;
        
        // Update card styling
        const card = document.getElementById('qrCard');
        card.style.background = qrCardConfig.bgColor;
        card.style.borderRadius = qrCardConfig.borderRadius + 'px';
        
        // Update text
        const title = document.getElementById('previewTitle');
        title.textContent = qrCardConfig.title;
        title.style.color = qrCardConfig.textColor;
        
        const subtitle = document.getElementById('previewSubtitle');
        subtitle.textContent = qrCardConfig.subtitle;
        subtitle.style.color = qrCardConfig.textColor;
        
        const message = document.getElementById('previewMessage');
        message.textContent = qrCardConfig.message;
        message.style.color = qrCardConfig.textColor;
        
        const hotelName = document.getElementById('previewHotelName');
        hotelName.textContent = propertyName;
        hotelName.style.color = qrCardConfig.textColor;
        
        // Update QR code
        const qrSize = qrCardConfig.qrSize;
        const qrURL = 'https://api.qrserver.com/v1/create-qr-code/?size=' + qrSize + 'x' + qrSize + '&data=' + encodeURIComponent(hotelURL);
        const qrImage = document.getElementById('qrImage');
        qrImage.src = qrURL;
        qrImage.style.width = qrSize + 'px';
        qrImage.style.height = qrSize + 'px';
        
        // Update festive overlay
        const overlayDiv = document.getElementById('festiveOverlayDiv');
        if (qrCardConfig.festiveOverlay && festiveOverlays[qrCardConfig.festiveOverlay]) {
          overlayDiv.textContent = festiveOverlays[qrCardConfig.festiveOverlay];
          overlayDiv.style.display = 'block';
        } else {
          overlayDiv.style.display = 'none';
        }
        
        // Update border radius value display
        document.getElementById('borderRadiusValue').textContent = qrCardConfig.borderRadius + 'px';
      }

      // Set festive overlay
      window.setFestiveOverlay = function(overlay, event) {
        currentFestiveOverlay = overlay;
        qrCardConfig.festiveOverlay = overlay;
        
        // Update button styles
        document.querySelectorAll('.festive-btn').forEach(btn => {
          btn.classList.remove('border-blue-500', 'border-red-500', 'border-yellow-500', 'border-pink-500', 
                                'border-purple-500', 'border-green-500', 'border-orange-500', 'ring-4', 'ring-blue-200');
          btn.classList.add('border-gray-300');
        });
        
        if (overlay && event) {
          const targetBtn = event.target.closest('.festive-btn');
          if (targetBtn) {
            targetBtn.classList.remove('border-gray-300');
            targetBtn.classList.add('ring-4', 'ring-blue-200', 'border-blue-500');
          }
        }
        
        // Update current overlay text
        const overlayNames = {
          christmas: 'Christmas 🎅',
          newyear: 'New Year 🎊',
          easter: 'Easter 🐰',
          ramadan: 'Ramadan 🌙',
          eid: 'Eid 🕌',
          halloween: 'Halloween 🎃',
          valentine: 'Valentine 💝'
        };
        document.getElementById('currentOverlay').textContent = 'Current: ' + (overlay ? overlayNames[overlay] : 'None');
        
        updateQRCardPreview();
      };

      // Save QR card design
      window.saveQRCard = async function() {
        try {
          const response = await fetch('/api/admin/qr-card/1', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              card_title: qrCardConfig.title,
              card_subtitle: qrCardConfig.subtitle,
              background_color: qrCardConfig.bgColor,
              text_color: qrCardConfig.textColor,
              qr_size: qrCardConfig.qrSize,
              border_radius: qrCardConfig.borderRadius,
              show_logo: true,
              festive_overlay: qrCardConfig.festiveOverlay,
              custom_message: qrCardConfig.message
            })
          });
          
          const data = await response.json();
          if (data.success) {
            alert('✅ QR Card Design Saved Successfully!');
          } else {
            alert('❌ Error saving design');
          }
        } catch (error) {
          console.error('Save QR card error:', error);
          alert('❌ Error saving design');
        }
      };

      // Reset QR card to defaults
      window.resetQRCard = function() {
        if (!confirm('Reset to default design? Any unsaved changes will be lost.')) return;
        
        document.getElementById('cardTitle').value = 'Scan for Hotel Services';
        document.getElementById('cardSubtitle').value = 'Access all amenities and services';
        document.getElementById('cardMessage').value = '';
        document.getElementById('bgColor').value = '#ffffff';
        document.getElementById('textColor').value = '#000000';
        document.getElementById('qrSize').value = '300';
        document.getElementById('borderRadius').value = '10';
        
        qrCardConfig = {
          title: 'Scan for Hotel Services',
          subtitle: 'Access all amenities and services',
          message: '',
          bgColor: '#ffffff',
          textColor: '#000000',
          qrSize: 300,
          borderRadius: 10,
          festiveOverlay: null
        };
        
        currentFestiveOverlay = null;
        setFestiveOverlay(null);
        updateQRCardPreview();
      };

      // Download QR card as image
      window.downloadQRCard = function() {
        const card = document.getElementById('qrCard');
        const propertyName = document.getElementById('propertyName').textContent;
        
        // Use html2canvas to capture the card
        alert('📥 Download feature: Right-click on the preview card and select "Save Image As..."' + String.fromCharCode(10) + String.fromCharCode(10) + 'Or use your browser screenshot tool to capture the card.');
      };

      // Print QR card
      window.printQRCard = function() {
        const card = document.getElementById('qrCard');
        const propertyName = document.getElementById('propertyName').textContent;
        
        const win = window.open('', '_blank');
        win.document.write('<html><head><title>Print QR Card - ' + propertyName + '</title>');
        win.document.write('<style>body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; } @media print { body { padding: 0; } }</style>');
        win.document.write('</head><body>');
        win.document.write('<div>' + card.outerHTML + '</div>');
        win.document.write('</body></html>');
        win.document.close();
        setTimeout(() => win.print(), 500);
      };

      // Event listeners for real-time updates
      document.getElementById('cardTitle').addEventListener('input', (e) => {
        qrCardConfig.title = e.target.value;
        updateQRCardPreview();
      });
      
      document.getElementById('cardSubtitle').addEventListener('input', (e) => {
        qrCardConfig.subtitle = e.target.value;
        updateQRCardPreview();
      });
      
      document.getElementById('cardMessage').addEventListener('input', (e) => {
        qrCardConfig.message = e.target.value;
        updateQRCardPreview();
      });
      
      document.getElementById('bgColor').addEventListener('input', (e) => {
        qrCardConfig.bgColor = e.target.value;
        updateQRCardPreview();
      });
      
      document.getElementById('textColor').addEventListener('input', (e) => {
        qrCardConfig.textColor = e.target.value;
        updateQRCardPreview();
      });
      
      document.getElementById('qrSize').addEventListener('change', (e) => {
        qrCardConfig.qrSize = parseInt(e.target.value);
        updateQRCardPreview();
      });
      
      document.getElementById('borderRadius').addEventListener('input', (e) => {
        qrCardConfig.borderRadius = parseInt(e.target.value);
        updateQRCardPreview();
      });
      
      // Analytics functions
      let currentAnalyticsRange = 'today';
      
      async function loadAnalytics(range) {
        if (range) currentAnalyticsRange = range;
        
        try {
          const response = await fetch('/api/admin/analytics?property_id=1&range=' + currentAnalyticsRange);
          const data = await response.json();
          
          // Update stats
          document.getElementById('totalScans').textContent = data.stats.totalScans;
          document.getElementById('activeBookings').textContent = data.stats.activeBookings;
          document.getElementById('totalActivities').textContent = data.stats.totalActivities;
          document.getElementById('totalVendors').textContent = data.stats.totalVendors;
          
          // Show comparison for scans
          const scansChange = parseFloat(data.stats.scansChange);
          const scansIcon = scansChange > 0 ? 'arrow-up' : scansChange < 0 ? 'arrow-down' : 'minus';
          const scansColor = scansChange > 0 ? 'text-green-200' : scansChange < 0 ? 'text-red-200' : 'text-blue-200';
          const scansChangeText = scansChange > 0 ? '+' + Math.abs(scansChange) : scansChange < 0 ? '-' + Math.abs(scansChange) : scansChange;
          document.getElementById('scansComparison').innerHTML = 
            '<i class="fas fa-' + scansIcon + ' ' + scansColor + '"></i>' +
            '<span class="' + scansColor + '">' + scansChangeText + '%</span>' +
            '<span>vs previous period</span>';
          
          // Show comparison for bookings
          const bookingsChange = parseFloat(data.stats.bookingsChange);
          const bookingsIcon = bookingsChange > 0 ? 'arrow-up' : bookingsChange < 0 ? 'arrow-down' : 'minus';
          const bookingsColor = bookingsChange > 0 ? 'text-green-200' : bookingsChange < 0 ? 'text-red-200' : 'text-green-200';
          const bookingsChangeText = bookingsChange > 0 ? '+' + Math.abs(bookingsChange) : bookingsChange < 0 ? '-' + Math.abs(bookingsChange) : bookingsChange;
          document.getElementById('bookingsComparison').innerHTML = 
            '<i class="fas fa-' + bookingsIcon + ' ' + bookingsColor + '"></i>' +
            '<span class="' + bookingsColor + '">' + bookingsChangeText + '%</span>' +
            '<span>vs previous period</span>';
          
          // Popular activities
          const activitiesHTML = data.popularActivities.map((a, i) => 
            '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">' +
            '<div class="flex items-center gap-3">' +
            '<span class="text-2xl font-bold text-gray-300">' + (i + 1) + '</span>' +
            '<div>' +
            '<p class="font-semibold">' + (a.title_en || 'Activity') + '</p>' +
            '<p class="text-sm text-gray-600">' + a.booking_count + ' bookings</p>' +
            '</div>' +
            '</div>' +
            '<span class="text-green-600 font-semibold">$' + (a.total_revenue || 0) + '</span>' +
            '</div>'
          ).join('');
          document.getElementById('popularActivities').innerHTML = activitiesHTML || '<p class="text-center text-gray-400 py-4">No activity data yet</p>';
          
          // Popular sections
          const sectionsHTML = data.popularSections.map((s, i) =>
            '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">' +
            '<div class="flex items-center gap-3">' +
            '<i class="fas fa-' + (s.icon || 'eye') + ' text-xl text-indigo-600"></i>' +
            '<p class="font-semibold capitalize">' + s.name + '</p>' +
            '</div>' +
            '<span class="text-blue-600 font-semibold">' + s.views + ' views</span>' +
            '</div>'
          ).join('');
          document.getElementById('popularSections').innerHTML = sectionsHTML || '<p class="text-center text-gray-400 py-4">No section data yet</p>';
          
        } catch (error) {
          console.error('Analytics load error:', error);
        }
      }
      
      function filterAnalytics(range) {
        // Update active button
        document.querySelectorAll('.date-filter-btn').forEach(btn => {
          btn.classList.remove('active', 'bg-blue-600', 'text-white');
          btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        event.target.classList.add('active', 'bg-blue-600', 'text-white');
        event.target.classList.remove('bg-gray-200', 'text-gray-700');
        
        // Reload analytics with new range
        loadAnalytics(range);
      }
      
      // Initialize: Load QR code tab by default (it's marked as tab-active)
      loadQRCode();
      loadQRCardTemplate();

      async function loadRegCode() {
        try {
          const response = await fetch('/api/admin/registration-code?property_id=1');
          const data = await response.json();
          document.getElementById('regCode').textContent = data.registration_code;
          const expiry = new Date(data.expires_at);
          document.getElementById('regCodeExpiry').textContent = expiry.toLocaleDateString();
        } catch (error) {
          console.error('Load reg code error:', error);
        }
      }

      async function regenerateRegCode() {
        if (!confirm('Regenerate registration code? The old code will no longer work.')) return;
        try {
          const response = await fetch('/api/admin/regenerate-registration-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: 1 })
          });
          const data = await response.json();
          if (data.success) {
            alert('New registration code generated!');
            loadRegCode();
          }
        } catch (error) {
          console.error('Regenerate code error:', error);
        }
      }

      async function loadCallbacks() {
        try {
          const response = await fetch('/api/admin/callback-requests?property_id=1');
          const data = await response.json();
          const list = document.getElementById('callbacksList');
          
          if (data.requests.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-center py-4">No callback requests</p>';
            return;
          }
          
          list.innerHTML = data.requests.map(r => \`
            <div class="border rounded-lg p-4 hover:shadow-md transition">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold">\${r.first_name} \${r.last_name}</h3>
                  <p class="text-sm text-gray-600"><i class="fas fa-phone mr-1"></i>\${r.phone}</p>
                  \${r.email ? '<p class="text-sm text-gray-600"><i class="fas fa-envelope mr-1"></i>' + r.email + '</p>' : ''}
                  <p class="text-sm text-gray-600 mt-2">Preferred: \${r.preferred_time}</p>
                  \${r.message ? '<p class="text-sm mt-2">' + r.message + '</p>' : ''}
                </div>
                <span class="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">\${r.status}</span>
              </div>
              <p class="text-xs text-gray-400 mt-2">\${new Date(r.created_at).toLocaleString()}</p>
            </div>
          \`).join('');
        } catch (error) {
          console.error('Load callbacks error:', error);
        }
      }

      async function loadRooms() {
        try {
          console.log('🔄 Loading rooms...');
          const response = await fetch('/api/admin/rooms?property_id=1');
          console.log('📡 Response status:', response.status);
          const rooms = await response.json();
          console.log('📦 Rooms received:', rooms.length, rooms);
          const list = document.getElementById('roomsList');
          console.log('📍 List element:', list);
          
          if (!list) {
            console.error('❌ roomsList element not found!');
            return;
          }
          
          if (!rooms || rooms.length === 0) {
            list.innerHTML = '<p class="text-gray-500 p-4">No rooms found. Add rooms below.</p>';
            return;
          }
          
          list.innerHTML = rooms.map(r => '<div class="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"><div><span class="font-bold text-lg">Room ' + r.room_number + '</span><span class="text-gray-600 ml-3">' + r.room_type + '</span></div><div class="flex gap-2"><a href="/hotel/paradise-resort" target="_blank" class="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"><i class="fas fa-external-link-alt mr-2"></i>Test QR</a><button onclick="regenerateQR(' + r.room_id + ')" class="bg-yellow-100 text-yellow-700 px-4 py-2 rounded hover:bg-yellow-200"><i class="fas fa-sync mr-2"></i>Regenerate QR</button></div></div>').join('');
        } catch (error) {
          console.error('Load rooms error:', error);
        }
      }

      async function loadVendors() {
        try {
          const response = await fetch('/api/admin/vendors?property_id=1');
          const vendors = await response.json();
          const list = document.getElementById('vendorsList');
          
          list.innerHTML = vendors.map(v => '<div class="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"><div><div class="font-bold text-lg">' + v.business_name + '</div><div class="text-sm text-gray-600">' + v.email + ' • ' + v.phone + '</div></div><div class="flex gap-2"><span class="px-3 py-1 rounded-full text-sm ' + (v.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') + '">' + v.status + '</span><button onclick="removeVendor(' + v.vendor_id + ')" class="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"><i class="fas fa-trash mr-2"></i>Remove</button></div></div>').join('');
        } catch (error) {
          console.error('Load vendors error:', error);
        }
      }

      // INFO PAGES MANAGEMENT
      let currentInfoPageId = null;

      async function loadInfoPages() {
        try {
          const response = await fetch('/api/admin/info-pages?property_id=1');
          const pages = await response.json();
          
          const container = document.getElementById('infoPagesContainer');
          
          if (pages.length === 0) {
            container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-file-alt text-5xl mb-4"></i><p class="text-lg">No info pages yet</p><p class="text-sm">Click "Create New Page" to get started!</p></div>';
            return;
          }
          
          let html = '';
          pages.forEach(page => {
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-800 border-blue-300',
              purple: 'bg-purple-100 text-purple-800 border-purple-300',
              green: 'bg-green-100 text-green-800 border-green-300',
              orange: 'bg-orange-100 text-orange-800 border-orange-300',
              red: 'bg-red-100 text-red-800 border-red-300',
              pink: 'bg-pink-100 text-pink-800 border-pink-300',
              indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
              teal: 'bg-teal-100 text-teal-800 border-teal-300'
            };
            const colorClass = colorClasses[page.color_theme] || colorClasses.blue;
            const publishStatus = page.is_published ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"><i class="fas fa-check mr-1"></i>Published</span>' : '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"><i class="fas fa-eye-slash mr-1"></i>Draft</span>';
            
            html += '<div class="border rounded-lg p-4 hover:shadow-lg transition flex justify-between items-center">' +
              '<div class="flex items-center gap-4 flex-1">' +
              '<div class="w-16 h-16 ' + colorClass + ' rounded-lg flex items-center justify-center text-2xl border-2">' +
              '<i class="' + page.icon_class + '"></i>' +
              '</div>' +
              '<div class="flex-1">' +
              '<h3 class="font-bold text-lg">' + page.title_en + '</h3>' +
              '<div class="flex gap-2 mt-1 text-sm text-gray-600">' +
              '<span><i class="fas fa-columns mr-1"></i>' + page.layout_type + '</span>' +
              '<span>•</span>' +
              publishStatus +
              '</div>' +
              '</div>' +
              '</div>' +
              '<div class="flex gap-2">' +
              '<button onclick="editInfoPage(' + page.page_id + ')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><i class="fas fa-edit mr-1"></i>Edit</button>' +
              '<button onclick="deleteInfoPage(' + page.page_id + ', &quot;' + page.title_en + '&quot;)" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"><i class="fas fa-trash mr-1"></i>Delete</button>' +
              '</div>' +
              '</div>';
          });
          
          container.innerHTML = html;
        } catch (error) {
          console.error('Load info pages error:', error);
        }
      }

      window.showInfoPageModal = function() {
        currentInfoPageId = null;
        document.getElementById('infoPageForm').reset();
        document.getElementById('infoPageId').value = '';
        document.getElementById('infoPageModalTitle').innerHTML = '<i class="fas fa-file-alt mr-2"></i>Create Info Page';
        document.getElementById('infoPageModal').classList.remove('hidden');
      }

      window.closeInfoPageModal = function() {
        document.getElementById('infoPageModal').classList.add('hidden');
        currentInfoPageId = null;
      }

      window.editInfoPage = async function(pageId) {
        try {
          const response = await fetch('/api/admin/info-pages/' + pageId);
          const page = await response.json();
          
          currentInfoPageId = pageId;
          document.getElementById('infoPageId').value = pageId;
          document.getElementById('infoPageTitle').value = page.title_en;
          document.getElementById('infoPageKey').value = page.page_key;
          document.getElementById('infoPageIcon').value = page.icon_class;
          document.getElementById('infoPageColor').value = page.color_theme;
          document.getElementById('infoPageLayout').value = page.layout_type;
          document.getElementById('infoPageContent').value = page.content_en || '';
          document.getElementById('infoPagePublished').checked = page.is_published === 1;
          document.getElementById('infoPageShowMenu').checked = page.show_in_menu === 1;
          
          document.getElementById('infoPageModalTitle').innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Info Page';
          document.getElementById('infoPageModal').classList.remove('hidden');
        } catch (error) {
          console.error('Edit info page error:', error);
          alert('Failed to load page details');
        }
      }

      window.saveInfoPage = async function() {
        const title = document.getElementById('infoPageTitle').value.trim();
        const content = document.getElementById('infoPageContent').value.trim();
        
        if (!title || !content) {
          alert('Please fill in title and content');
          return;
        }
        
        const data = {
          property_id: 1,
          page_key: document.getElementById('infoPageKey').value || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          title_en: title,
          content_en: content,
          icon_class: document.getElementById('infoPageIcon').value,
          color_theme: document.getElementById('infoPageColor').value,
          layout_type: document.getElementById('infoPageLayout').value,
          is_published: document.getElementById('infoPagePublished').checked ? 1 : 0,
          show_in_menu: document.getElementById('infoPageShowMenu').checked ? 1 : 0
        };
        
        try {
          const pageId = document.getElementById('infoPageId').value;
          const url = pageId ? '/api/admin/info-pages/' + pageId : '/api/admin/info-pages';
          const method = pageId ? 'PUT' : 'POST';
          
          const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          const result = await response.json();
          
          if (result.success) {
            alert(pageId ? 'Page updated successfully!' : 'Page created successfully!');
            closeInfoPageModal();
            loadInfoPages();
          } else {
            alert('Failed to save page: ' + (result.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Save info page error:', error);
          alert('Failed to save page');
        }
      }

      window.deleteInfoPage = async function(pageId, title) {
        if (!confirm('Delete info page "' + title + '"?' + String.fromCharCode(10) + String.fromCharCode(10) + 'This cannot be undone.')) {
          return;
        }
        
        try {
          const response = await fetch('/api/admin/info-pages/' + pageId, {
            method: 'DELETE'
          });
          
          const result = await response.json();
          
          if (result.success) {
            alert('Page deleted successfully!');
            loadInfoPages();
          } else {
            alert('Failed to delete page');
          }
        } catch (error) {
          console.error('Delete info page error:', error);
          alert('Failed to delete page');
        }
      }

      // Rich Text Editor Functions
      window.formatText = function(command) {
        const textarea = document.getElementById('infoPageContent');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        
        let formatted = '';
        
        switch(command) {
          case 'bold':
            formatted = '<strong>' + selected + '</strong>';
            break;
          case 'italic':
            formatted = '<em>' + selected + '</em>';
            break;
          case 'underline':
            formatted = '<u>' + selected + '</u>';
            break;
          case 'h2':
            formatted = '<h2 class="text-2xl font-bold mb-3 mt-6">' + selected + '</h2>';
            break;
          case 'h3':
            formatted = '<h3 class="text-xl font-bold mb-2 mt-4">' + selected + '</h3>';
            break;
          case 'ul':
            formatted = '<ul class="list-disc list-inside space-y-1 mb-4">' + String.fromCharCode(10) + '  <li>' + selected + '</li>' + String.fromCharCode(10) + '</ul>';
            break;
          case 'ol':
            formatted = '<ol class="list-decimal list-inside space-y-1 mb-4">' + String.fromCharCode(10) + '  <li>' + selected + '</li>' + String.fromCharCode(10) + '</ol>';
            break;
        }
        
        textarea.value = before + formatted + after;
        textarea.focus();
        textarea.selectionStart = start;
        textarea.selectionEnd = start + formatted.length;
      }

      window.insertTable = function() {
        const table = '<table class="w-full border-collapse border border-gray-300 mb-4">' + String.fromCharCode(10) +
          '  <thead>' + String.fromCharCode(10) +
          '    <tr class="bg-gray-100">' + String.fromCharCode(10) +
          '      <th class="border border-gray-300 px-4 py-2">Header 1</th>' + String.fromCharCode(10) +
          '      <th class="border border-gray-300 px-4 py-2">Header 2</th>' + String.fromCharCode(10) +
          '    </tr>' + String.fromCharCode(10) +
          '  </thead>' + String.fromCharCode(10) +
          '  <tbody>' + String.fromCharCode(10) +
          '    <tr>' + String.fromCharCode(10) +
          '      <td class="border border-gray-300 px-4 py-2">Data 1</td>' + String.fromCharCode(10) +
          '      <td class="border border-gray-300 px-4 py-2">Data 2</td>' + String.fromCharCode(10) +
          '    </tr>' + String.fromCharCode(10) +
          '  </tbody>' + String.fromCharCode(10) +
          '</table>';
        
        const textarea = document.getElementById('infoPageContent');
        textarea.value += String.fromCharCode(10) + table;
      }

      window.insertCallout = function(type) {
        const colors = {
          info: 'bg-blue-50 border-blue-300 text-blue-800',
          warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
          success: 'bg-green-50 border-green-300 text-green-800'
        };
        const icons = {
          info: 'fas fa-info-circle',
          warning: 'fas fa-exclamation-triangle',
          success: 'fas fa-check-circle'
        };
        
        const callout = '<div class="border-l-4 p-4 mb-4 ' + colors[type] + '">' + String.fromCharCode(10) +
          '  <div class="flex items-start">' + String.fromCharCode(10) +
          '    <i class="' + icons[type] + ' text-xl mr-3 mt-1"></i>' + String.fromCharCode(10) +
          '    <div>' + String.fromCharCode(10) +
          '      <p class="font-semibold">Important Note</p>' + String.fromCharCode(10) +
          '      <p>Your message here...</p>' + String.fromCharCode(10) +
          '    </div>' + String.fromCharCode(10) +
          '  </div>' + String.fromCharCode(10) +
          '</div>';
        
        const textarea = document.getElementById('infoPageContent');
        textarea.value += String.fromCharCode(10) + callout;
      }

      window.insertDivider = function() {
        const textarea = document.getElementById('infoPageContent');
        textarea.value += String.fromCharCode(10) + '<hr class="my-6 border-gray-300">' + String.fromCharCode(10);
      }

      window.previewContent = function() {
        const content = document.getElementById('infoPageContent').value;
        const title = document.getElementById('infoPageTitle').value || 'Preview';
        const icon = document.getElementById('infoPageIcon').value;
        
        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write('<html><head><title>' + title + '</title>');
        win.document.write('<script src="https://cdn.tailwindcss.com"><\\/script>');
        win.document.write('<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">');
        win.document.write('</head><body class="bg-gray-50 p-8">');
        win.document.write('<div class="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">');
        win.document.write('<h1 class="text-3xl font-bold mb-6"><i class="' + icon + ' mr-3 text-purple-600"></i>' + title + '</h1>');
        win.document.write('<div class="prose max-w-none">' + content + '</div>');
        win.document.write('</div></body></html>');
        win.document.close();
      }

      // Auto-generate page key from title
      document.getElementById('infoPageTitle').addEventListener('input', (e) => {
        if (!currentInfoPageId) {
          const key = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          document.getElementById('infoPageKey').value = key;
        }
      });

      async function loadActivities() {
        try {
          const response = await fetch('/api/admin/activities?property_id=1');
          const activities = await response.json();
          const list = document.getElementById('activitiesList');
          
          if (!activities || activities.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-center py-4">No activities yet. Add vendors to start!</p>';
            return;
          }
          
          list.innerHTML = activities.map(a => \`
            <div class="border rounded-lg p-4 hover:shadow-md transition">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-bold">\${a.title_en}</h3>
                  <p class="text-sm text-gray-600">by \${a.business_name} • \${a.category_name}</p>
                  <div class="flex gap-4 mt-2 text-sm text-gray-600">
                    <span><i class="fas fa-tag mr-1"></i>USD \${a.price}</span>
                    <span><i class="far fa-clock mr-1"></i>\${a.duration_minutes} min</span>
                    <span><i class="fas fa-users mr-1"></i>Capacity: \${a.capacity_per_slot}</span>
                  </div>
                </div>
                <div class="flex flex-col gap-2 items-end">
                  <span class="px-3 py-1 rounded-full text-sm \${a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">\${a.status}</span>
                  <button onclick="deactivateActivity(\${a.activity_id})" class="text-red-600 hover:text-red-800 text-sm">
                    <i class="fas fa-ban mr-1"></i>Deactivate
                  </button>
                </div>
              </div>
            </div>
          \`).join('');
        } catch (error) {
          console.error('Load activities error:', error);
        }
      }

      async function deactivateActivity(activityId) {
        if (!confirm('Deactivate this activity? It will no longer be visible to guests.')) return;
        try {
          const response = await fetch('/api/admin/activities/' + activityId, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (data.success) {
            alert('Activity deactivated!');
            loadActivities();
          }
        } catch (error) {
          console.error('Deactivate activity error:', error);
          alert('Failed to deactivate activity');
        }
      }

      // Custom Sections Management
      async function loadCustomSections() {
        try {
          const response = await fetch('/api/admin/custom-sections?property_id=1');
          const data = await response.json();
          const list = document.getElementById('customSectionsList');
          
          if (!data.sections || data.sections.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-center py-4">No custom sections yet. Create your first custom section above!</p>';
            return;
          }
          
          list.innerHTML = data.sections.map(s => \`
            <div class="border rounded-lg p-4 hover:shadow-md transition">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold text-lg">
                    <i class="\${s.icon_class} mr-2" style="color: var(--primary-color);"></i>
                    \${s.section_name_en}
                  </h3>
                  <p class="text-sm text-gray-600">Key: <code class="bg-gray-100 px-2 py-1 rounded">\${s.section_key}</code></p>
                  <p class="text-sm text-gray-500 mt-1">Order: \${s.display_order} | Visible: \${s.is_visible ? '✅ Yes' : '❌ No'}</p>
                </div>
                <button onclick="deleteCustomSection(\${s.section_id})" class="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">
                  <i class="fas fa-trash mr-1"></i>Delete
                </button>
              </div>
            </div>
          \`).join('');
        } catch (error) {
          console.error('Load custom sections error:', error);
        }
      }

      async function deleteCustomSection(sectionId) {
        if (!confirm('Delete this custom section? All offerings linked to this section will remain but will not be displayed.')) return;
        try {
          const response = await fetch('/api/admin/custom-sections/' + sectionId, {
            method: 'DELETE'
          });
          if (response.ok) {
            alert('Custom section deleted!');
            loadCustomSections();
          }
        } catch (error) {
          console.error('Delete custom section error:', error);
          alert('Failed to delete custom section');
        }
      }

      document.getElementById('addCustomSectionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
          property_id: 1,
          section_key: document.getElementById('sectionKey').value,
          section_name_en: document.getElementById('sectionNameEn').value,
          icon_class: document.getElementById('sectionIcon').value,
          color_class: document.getElementById('sectionColor').value,
          display_order: parseInt(document.getElementById('sectionOrder').value),
          is_visible: 1
        };
        
        try {
          const response = await fetch('/api/admin/custom-sections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          if (response.ok) {
            alert('Custom section created! Now add offerings to this section.');
            loadCustomSections();
            e.target.reset();
          } else {
            alert('Failed to create custom section. Make sure the section key is unique.');
          }
        } catch (error) {
          console.error('Create custom section error:', error);
          alert('Failed to create custom section');
        }
      });

      // Hotel Offerings Management
      let allOfferings = [];
      let currentOfferingFilter = 'all';
      
      async function loadOfferings() {
        try {
          // Load property settings if not already loaded
          if (!adminPropertySettings) {
            const settingsResponse = await fetch('/api/admin/property-settings?property_id=1');
            adminPropertySettings = await settingsResponse.json();
          }
          
          const response = await fetch('/api/hotel-offerings/1');
          const data = await response.json();
          allOfferings = data.offerings || [];
          displayOfferings();
          
          // Also load custom sections for the dropdown
          await loadCustomSectionsDropdown();
          
          // Update filter buttons with custom section names
          updateAdminFilterButtons(adminPropertySettings);
        } catch (error) {
          console.error('Load offerings error:', error);
        }
      }
      
      async function loadCustomSectionsDropdown() {
        try {
          const response = await fetch('/api/admin/custom-sections?property_id=1');
          const data = await response.json();
          const dropdown = document.getElementById('offeringType');
          
          // Remove any previously added custom section options
          const existingOptions = dropdown.querySelectorAll('option[data-custom="true"]');
          existingOptions.forEach(opt => opt.remove());
          
          // Add custom sections to dropdown
          if (data.sections && data.sections.length > 0) {
            data.sections.forEach(section => {
              const option = document.createElement('option');
              option.value = section.section_key;
              option.textContent = section.section_name_en;
              option.setAttribute('data-custom', 'true');
              dropdown.appendChild(option);
            });
          }
        } catch (error) {
          console.error('Load custom sections dropdown error:', error);
        }
      }
      
      function displayOfferings() {
        const filteredOfferings = currentOfferingFilter === 'all' 
          ? allOfferings 
          : allOfferings.filter(o => o.offering_type === currentOfferingFilter);
        
        const list = document.getElementById('offeringsList');
        if (filteredOfferings.length === 0) {
          list.innerHTML = '<p class="text-gray-500">No offerings found</p>';
          return;
        }
        
        list.innerHTML = filteredOfferings.map(o => {
          const typeColors = {
            restaurant: 'bg-blue-100 text-blue-700',
            event: 'bg-purple-100 text-purple-700',
            spa: 'bg-green-100 text-green-700',
            service: 'bg-gray-100 text-gray-700'
          };
          
          return \`
            <div class="border rounded-lg p-4 hover:shadow-md">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h3 class="font-bold text-lg">\${o.title}</h3>
                  <span class="inline-block px-2 py-1 rounded text-xs \${typeColors[o.offering_type] || typeColors.service}">
                    \${o.offering_type.toUpperCase()}
                  </span>
                </div>
                <div class="flex gap-2">
                  \${o.offering_type === 'restaurant' ? \`<a href="/admin/restaurant/\${o.offering_id}" class="text-green-600 hover:text-green-800" title="Manage Tables"><i class="fas fa-chair"></i></a>\` : ''}
                  <button onclick="editOffering(\${o.offering_id})" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="deleteOffering(\${o.offering_id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <p class="text-sm text-gray-600 mb-2">\${o.short_description}</p>
              <div class="flex flex-wrap gap-3 text-sm text-gray-700">
                <span><i class="fas fa-dollar-sign mr-1"></i>\${o.currency} \${o.price || 'Free'}</span>
                <span><i class="fas fa-map-marker-alt mr-1"></i>\${o.location || 'N/A'}</span>
                \${o.duration_minutes ? \`<span><i class="fas fa-clock mr-1"></i>\${o.duration_minutes} min</span>\` : ''}
                \${o.event_date ? \`<span><i class="fas fa-calendar mr-1"></i>\${o.event_date}</span>\` : ''}
              </div>
            </div>
          \`;
        }).join('');
      }
      
      function filterOfferings(type) {
        currentOfferingFilter = type;
        document.querySelectorAll('.offering-filter-btn').forEach(btn => {
          if (btn.dataset.type === type) {
            btn.className = 'offering-filter-btn px-4 py-2 rounded bg-blue-500 text-white';
          } else {
            btn.className = 'offering-filter-btn px-4 py-2 rounded bg-gray-200';
          }
        });
        displayOfferings();
      }
      
      async function deleteOffering(offeringId) {
        if (!confirm('Delete this offering? This action cannot be undone.')) return;
        
        console.log('Attempting to delete offering:', offeringId);
        
        try {
          const response = await fetch('/api/admin/offerings/' + offeringId, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Delete response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete failed with status:', response.status, errorText);
            alert('Failed to delete offering: ' + response.status + ' ' + errorText);
            return;
          }
          
          const data = await response.json();
          console.log('Delete response data:', data);
          
          if (data.success) {
            alert('Offering deleted successfully!');
            loadOfferings();
          } else {
            alert('Failed to delete offering: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Delete offering error:', error);
          alert('Failed to delete offering: ' + error.message);
        }
      }
      
      async function translateAllOfferings() {
        const btn = document.getElementById('translateAllBtn');
        const originalText = btn.innerHTML;
        
        if (!confirm('This will translate ALL offerings to 8 languages (Arabic, German, Russian, Polish, Italian, French, Czech, Ukrainian).' + String.fromCharCode(10) + String.fromCharCode(10) + 'This may take 2-3 minutes depending on the number of offerings.' + String.fromCharCode(10) + String.fromCharCode(10) + 'Proceed?')) {
          return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Translating...';
        
        try {
          const response = await fetch('/api/admin/offerings/translate-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              openai_api_key: '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'
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            alert('✅ Translation Complete!' + String.fromCharCode(10) + String.fromCharCode(10) + 'Total offerings: ' + data.total + String.fromCharCode(10) + 'Successfully translated: ' + data.translated + String.fromCharCode(10) + 'Failed: ' + data.failed + String.fromCharCode(10) + String.fromCharCode(10) + 'All offerings now available in 8 languages!');
            loadOfferings();
          } else {
            alert('Translation failed: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Batch translation error:', error);
          alert('Translation failed: ' + error.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
      
      async function editOffering(offeringId) {
        const offering = allOfferings.find(o => o.offering_id === offeringId);
        if (!offering) return;
        
        // Populate form with existing data
        document.getElementById('offeringType').value = offering.offering_type;
        document.getElementById('offeringTitle').value = offering.title_en;
        document.getElementById('offeringDescription').value = offering.short_description_en;
        document.getElementById('offeringFullDescription').value = offering.full_description_en || '';
        document.getElementById('offeringPrice').value = offering.price || '';
        document.getElementById('offeringLocation').value = offering.location || '';
        document.getElementById('offeringDuration').value = offering.duration_minutes || '';
        document.getElementById('offeringImages').value = offering.images ? offering.images.join(String.fromCharCode(10)) : '';
        document.getElementById('offeringVideoUrl').value = offering.video_url || '';
        document.getElementById('offeringRequiresBooking').checked = offering.requires_booking === 1;
        
        if (offering.offering_type === 'event') {
          document.getElementById('eventFields').classList.remove('hidden');
          document.getElementById('eventDate').value = offering.event_date || '';
          document.getElementById('eventStartTime').value = offering.event_start_time || '';
          document.getElementById('eventEndTime').value = offering.event_end_time || '';
        }
        
        // Load and show restaurant menus if restaurant type
        if (offering.offering_type === 'restaurant') {
          document.getElementById('restaurantFields').classList.remove('hidden');
          
          // Load existing menus
          fetch('/api/offerings/' + offeringId + '/menus')
            .then(res => res.json())
            .then(data => {
              if (data.success && data.menus) {
                const menuUrls = data.menus.map(m => m.menu_url).join(String.fromCharCode(10));
                document.getElementById('menuUrls').value = menuUrls;
              }
            })
            .catch(err => console.error('Error loading menus for edit:', err));
        }
        
        // Change form submit to update instead of create
        const form = document.getElementById('addOfferingForm');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const images = document.getElementById('offeringImages').value.split(String.fromCharCode(10)).map(url => url.trim()).filter(Boolean);
          
          // Get menu URLs if restaurant
          const menuUrls = [];
          const offeringType = document.getElementById('offeringType').value;
          if (offeringType === 'restaurant') {
            const menuUrlsText = document.getElementById('menuUrls').value;
            if (menuUrlsText) {
              menuUrlsText.split(String.fromCharCode(10)).forEach(url => {
                const trimmedUrl = url.trim();
                if (trimmedUrl) menuUrls.push(trimmedUrl);
              });
            }
          }
          
          try {
            const response = await fetch('/api/admin/offerings/' + offeringId, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                offering_type: offeringType,
                title_en: document.getElementById('offeringTitle').value,
                short_description_en: document.getElementById('offeringDescription').value,
                full_description_en: document.getElementById('offeringFullDescription').value,
                price: parseFloat(document.getElementById('offeringPrice').value) || 0,
                location: document.getElementById('offeringLocation').value,
                duration_minutes: parseInt(document.getElementById('offeringDuration').value) || null,
                requires_booking: document.getElementById('offeringRequiresBooking').checked ? 1 : 0,
                images: JSON.stringify(images),
                video_url: document.getElementById('offeringVideoUrl').value || null,
                event_date: document.getElementById('eventDate').value || null,
                event_start_time: document.getElementById('eventStartTime').value || null,
                event_end_time: document.getElementById('eventEndTime').value || null,
                menu_urls: menuUrls.length > 0 ? menuUrls : null
              })
            });
            
            const data = await response.json();
            if (data.success) {
              alert('Offering updated successfully!');
              form.reset();
              document.getElementById('eventFields').classList.add('hidden');
              document.getElementById('restaurantFields').classList.add('hidden');
              document.getElementById('menuUrls').value = '';
              // Reset form back to create mode
              form.onsubmit = null;
              loadOfferings();
            }
          } catch (error) {
            console.error('Update offering error:', error);
            alert('Failed to update offering');
          }
        };
        
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
      }


      // Show/hide event-specific fields based on offering type
      document.getElementById('offeringType').addEventListener('change', (e) => {
        const eventFields = document.getElementById('eventFields');
        const restaurantFields = document.getElementById('restaurantFields');
        
        if (e.target.value === 'event') {
          eventFields.classList.remove('hidden');
          restaurantFields.classList.add('hidden');
        } else if (e.target.value === 'restaurant') {
          restaurantFields.classList.remove('hidden');
          eventFields.classList.add('hidden');
        } else {
          eventFields.classList.add('hidden');
          restaurantFields.classList.add('hidden');
        }
      });

      document.getElementById('addRoomForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const response = await fetch('/api/admin/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              room_number: document.getElementById('roomNumber').value,
              room_type: document.getElementById('roomType').value
            })
          });
          const data = await response.json();
          if (data.success) {
            alert('Room created with QR code!');
            document.getElementById('addRoomForm').reset();
            loadRooms();
          }
        } catch (error) {
          console.error('Add room error:', error);
          alert('Failed to create room');
        }
      });

      document.getElementById('addOfferingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const images = document.getElementById('offeringImages').value.split(String.fromCharCode(10)).map(url => url.trim()).filter(Boolean);
          const selectedType = document.getElementById('offeringType').value;
          const selectedOption = document.getElementById('offeringType').selectedOptions[0];
          const isCustomSection = selectedOption.getAttribute('data-custom') === 'true';
          
          // Get menu URLs if restaurant
          const menuUrls = [];
          if (selectedType === 'restaurant') {
            const menuUrlsText = document.getElementById('menuUrls').value;
            if (menuUrlsText) {
              menuUrlsText.split(String.fromCharCode(10)).forEach(url => {
                const trimmedUrl = url.trim();
                if (trimmedUrl) menuUrls.push(trimmedUrl);
              });
            }
          }
          
          const payload = {
            property_id: 1,
            offering_type: isCustomSection ? 'custom' : selectedType,
            custom_section_key: isCustomSection ? selectedType : null,
            title_en: document.getElementById('offeringTitle').value,
            short_description_en: document.getElementById('offeringDescription').value,
            full_description_en: document.getElementById('offeringFullDescription').value,
            price: parseFloat(document.getElementById('offeringPrice').value) || 0,
            location: document.getElementById('offeringLocation').value,
            duration_minutes: parseInt(document.getElementById('offeringDuration').value) || null,
            requires_booking: document.getElementById('offeringRequiresBooking').checked ? 1 : 0,
            images: JSON.stringify(images),
            video_url: document.getElementById('offeringVideoUrl').value || null,
            event_date: document.getElementById('eventDate').value || null,
            event_start_time: document.getElementById('eventStartTime').value || null,
            event_end_time: document.getElementById('eventEndTime').value || null,
            menu_urls: menuUrls.length > 0 ? menuUrls : null
          };
          
          const response = await fetch('/api/admin/offerings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Hotel offering added successfully!');
            document.getElementById('addOfferingForm').reset();
            document.getElementById('eventFields').classList.add('hidden');
            document.getElementById('restaurantFields').classList.add('hidden');
            document.getElementById('menuUrls').value = '';
            loadOfferings();
          }
        } catch (error) {
          console.error('Add offering error:', error);
          alert('Failed to add offering');
        }
      });

      document.getElementById('addVendorForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const response = await fetch('/api/admin/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              business_name: document.getElementById('businessName').value,
              email: document.getElementById('vendorEmail').value,
              phone: document.getElementById('vendorPhone').value,
              password: document.getElementById('vendorPassword').value
            })
          });
          const data = await response.json();
          if (data.success) {
            alert('Vendor added successfully!');
            document.getElementById('addVendorForm').reset();
            loadVendors();
          }
        } catch (error) {
          console.error('Add vendor error:', error);
          alert('Failed to add vendor');
        }
      });

      async function regenerateQR(roomId) {
        if (!confirm('Regenerate QR code for this room?')) return;
        try {
          const response = await fetch('/api/admin/rooms/' + roomId + '/regenerate-qr', { method: 'POST' });
          const data = await response.json();
          if (data.success) {
            alert('QR code regenerated!');
            loadRooms();
          }
        } catch (error) {
          console.error('Regenerate QR error:', error);
        }
      }

      async function removeVendor(vendorId) {
        if (!confirm('Remove this vendor? This will deactivate all their activities.')) return;
        try {
          const response = await fetch('/api/admin/vendors/' + vendorId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: 1 })
          });
          const data = await response.json();
          if (data.success) {
            alert('Vendor removed successfully');
            loadVendors();
          }
        } catch (error) {
          console.error('Remove vendor error:', error);
          alert('Failed to remove vendor');
        }
      }

      let adminPropertySettings = null; // Store settings globally for admin panel
      
      async function loadSettings() {
        try {
          const response = await fetch('/api/admin/property-settings?property_id=1');
          const settings = await response.json();
          adminPropertySettings = settings; // Store for later use
          
          // Set homepage URL
          const homepageUrl = window.location.origin + '/hotel/' + settings.slug;
          document.getElementById('homepageUrl').value = homepageUrl;
          document.getElementById('visitHomepage').href = homepageUrl;
          
          // Load current settings
          document.getElementById('hotelName').value = settings.name || '';
          document.getElementById('hotelTagline').value = settings.tagline || '';
          document.getElementById('hotelEmail').value = settings.contact_email || '';
          document.getElementById('hotelPhone').value = settings.contact_phone || '';
          document.getElementById('hotelAddress').value = settings.address || '';
          
          // Load section names (custom labels)
          document.getElementById('sectionNameRestaurants').value = settings.section_restaurants_en || '';
          document.getElementById('sectionNameEvents').value = settings.section_events_en || '';
          document.getElementById('sectionNameSpa').value = settings.section_spa_en || '';
          document.getElementById('sectionNameService').value = settings.section_service_en || '';
          document.getElementById('sectionNameActivities').value = settings.section_activities_en || '';
          
          document.getElementById('brandLogoUrl').value = settings.brand_logo_url || '';
          document.getElementById('heroImageUrl').value = settings.hero_image_url || '';
          document.getElementById('heroOverlayOpacity').value = settings.hero_overlay_opacity || 30;
          document.getElementById('heroOverlayValue').textContent = (settings.hero_overlay_opacity || 30) + '%';
          
          // Set hero image effect radio
          const effectRadios = document.querySelectorAll('input[name="heroImageEffect"]');
          effectRadios.forEach(radio => {
            if (radio.value === (settings.hero_image_effect || 'none')) {
              radio.checked = true;
            }
          });
          
          // Hero overlay opacity slider
          document.getElementById('heroOverlayOpacity').addEventListener('input', (e) => {
            document.getElementById('heroOverlayValue').textContent = e.target.value + '%';
          });
          
          document.getElementById('primaryColor').value = settings.primary_color || '#3B82F6';
          document.getElementById('primaryColorText').value = settings.primary_color || '#3B82F6';
          document.getElementById('secondaryColor').value = settings.secondary_color || '#10B981';
          document.getElementById('secondaryColorText').value = settings.secondary_color || '#10B981';
          document.getElementById('accentColor').value = settings.accent_color || '#F59E0B';
          document.getElementById('accentColorText').value = settings.accent_color || '#F59E0B';
          
          document.getElementById('fontFamily').value = settings.font_family || 'inter';
          document.getElementById('buttonStyle').value = settings.button_style || 'rounded';
          
          // Update admin filter buttons with custom section names
          updateAdminFilterButtons(settings);
          document.getElementById('cardStyle').value = settings.card_style || 'shadow';
          document.getElementById('headerStyle').value = settings.header_style || 'transparent';
          
          // Set layout style radio
          const layoutRadios = document.querySelectorAll('input[name="layoutStyle"]');
          layoutRadios.forEach(radio => {
            if (radio.value === (settings.layout_style || 'modern')) {
              radio.checked = true;
            }
          });
          
          // Sync color pickers with text inputs
          document.getElementById('primaryColor').addEventListener('input', (e) => {
            document.getElementById('primaryColorText').value = e.target.value;
          });
          document.getElementById('primaryColorText').addEventListener('input', (e) => {
            document.getElementById('primaryColor').value = e.target.value;
          });
          
          document.getElementById('secondaryColor').addEventListener('input', (e) => {
            document.getElementById('secondaryColorText').value = e.target.value;
          });
          document.getElementById('secondaryColorText').addEventListener('input', (e) => {
            document.getElementById('secondaryColor').value = e.target.value;
          });
          
          document.getElementById('accentColor').addEventListener('input', (e) => {
            document.getElementById('accentColorText').value = e.target.value;
            updateGradientPreview();
          });
          document.getElementById('accentColorText').addEventListener('input', (e) => {
            document.getElementById('accentColor').value = e.target.value;
            updateGradientPreview();
          });
          
          // Gradient checkbox
          document.getElementById('primaryGradient').checked = settings.use_gradient === 1;
          if (settings.use_gradient === 1) {
            document.getElementById('primaryGradientPreview').classList.remove('hidden');
          }
          
          document.getElementById('primaryGradient').addEventListener('change', (e) => {
            if (e.target.checked) {
              document.getElementById('primaryGradientPreview').classList.remove('hidden');
              updateGradientPreview();
            } else {
              document.getElementById('primaryGradientPreview').classList.add('hidden');
            }
          });
          
          updateGradientPreview();
          
          // Load homepage layout settings
          document.getElementById('hotelMapUrl').value = settings.hotel_map_url || '';
          document.getElementById('showHotelMap').checked = settings.show_hotel_map === 1;
          
          // Render section visibility checkboxes dynamically
          await renderSectionVisibility();
          
          // Set visibility values after rendering
          document.getElementById('showRestaurants').checked = settings.show_restaurants === 1;
          document.getElementById('showEvents').checked = settings.show_events === 1;
          document.getElementById('showSpa').checked = settings.show_spa === 1;
          document.getElementById('showService').checked = settings.show_service === 1;
          document.getElementById('showActivities').checked = settings.show_activities === 1;
          
          // Load section order
          const sectionOrder = settings.homepage_section_order ? 
            JSON.parse(settings.homepage_section_order) : 
            ['restaurants', 'events', 'spa', 'service', 'activities'];
          await renderSectionOrder(sectionOrder);
          
        } catch (error) {
          console.error('Load settings error:', error);
          alert('Failed to load settings');
        }
      }
      
      function updateAdminFilterButtons(settings) {
        console.log('🔧 updateAdminFilterButtons called with settings:', settings);
        
        // Update admin panel filter button text with custom section names
        const sections = [
          { key: 'restaurant', elementId: 'admin-pill-restaurants', settingKey: 'section_restaurants_en', default: 'Restaurants', optionValue: 'restaurant', optionDefault: 'Restaurant' },
          { key: 'event', elementId: 'admin-pill-events', settingKey: 'section_events_en', default: 'Events', optionValue: 'event', optionDefault: 'Event' },
          { key: 'spa', elementId: 'admin-pill-spa', settingKey: 'section_spa_en', default: 'Spa', optionValue: 'spa', optionDefault: 'Spa/Wellness' }
        ];
        
        sections.forEach(section => {
          // Update filter button
          const element = document.getElementById(section.elementId);
          console.log('🔍 Looking for element:', section.elementId, 'Found:', !!element);
          if (element) {
            const customName = settings[section.settingKey];
            console.log('📝 Setting key:', section.settingKey, 'Value from DB:', customName);
            element.textContent = customName || section.default;
            console.log('✅ Admin filter updated:', section.key, '→', customName || section.default);
          } else {
            console.warn('❌ Element not found:', section.elementId);
          }
          
          // Update dropdown option
          const dropdown = document.getElementById('offeringType');
          if (dropdown) {
            const option = dropdown.querySelector('option[value="' + section.optionValue + '"]');
            if (option) {
              const customName = settings[section.settingKey];
              option.textContent = customName || section.optionDefault;
              console.log('✅ Dropdown updated:', section.optionValue, '→', customName || section.optionDefault);
            }
          }
        });
      }
      
      // ============================================
      // CHATBOT MANAGEMENT
      // ============================================
      
      async function loadChatbot() {
        try {
          // Load chatbot settings
          const settingsRes = await fetch('/api/chatbot/settings/1');
          const settingsData = await settingsRes.json();
          
          if (settingsData.success && settingsData.settings) {
            document.getElementById('chatbotEnabled').checked = settingsData.settings.chatbot_enabled === 1;
            document.getElementById('chatbotName').value = settingsData.settings.chatbot_name || '';
            document.getElementById('chatbotGreeting').value = settingsData.settings.chatbot_greeting_en || '';
          }
          
          // Load documents
          await loadChatbotDocuments();
        } catch (error) {
          console.error('Load chatbot error:', error);
        }
      }
      
      async function loadChatbotDocuments() {
        try {
          const response = await fetch('/api/admin/chatbot/documents?property_id=1');
          const data = await response.json();
          
          const container = document.getElementById('documentsList');
          
          if (!data.success || !data.documents || data.documents.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8"><i class="fas fa-folder-open mr-2"></i>No documents yet. Add your first knowledge document above!</p>';
            return;
          }
          
          container.innerHTML = data.documents.map(doc => {
            const typeClass = doc.document_type === 'faq' ? 'bg-blue-100 text-blue-800' : doc.document_type === 'policy' ? 'bg-purple-100 text-purple-800' : doc.document_type === 'amenity' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
            return '<div class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition">' +
              '<div class="flex justify-between items-start">' +
                '<div class="flex-1">' +
                  '<div class="flex items-center mb-2">' +
                    '<span class="px-3 py-1 text-xs font-semibold rounded-full ' + typeClass + ' mr-2">' +
                      doc.document_type.toUpperCase() +
                    '</span>' +
                    '<h4 class="text-lg font-bold">' + doc.title + '</h4>' +
                  '</div>' +
                  '<p class="text-gray-600 text-sm mb-2 line-clamp-2">' + doc.content.substring(0, 150) + '...</p>' +
                  '<div class="flex items-center text-xs text-gray-500 space-x-4">' +
                    '<span><i class="fas fa-cube mr-1"></i>' + doc.chunk_count + ' chunks</span>' +
                    '<span><i class="fas fa-calendar mr-1"></i>' + new Date(doc.created_at).toLocaleDateString() + '</span>' +
                  '</div>' +
                '</div>' +
                '<button onclick="deleteChatbotDocument(' + doc.document_id + ')" class="ml-4 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition">' +
                  '<i class="fas fa-trash"></i>' +
                '</button>' +
              '</div>' +
            '</div>';
          }).join('');
        } catch (error) {
          console.error('Load documents error:', error);
          document.getElementById('documentsList').innerHTML = '<p class="text-red-500 text-center py-8"><i class="fas fa-exclamation-circle mr-2"></i>Error loading documents</p>';
        }
      }
      
      window.saveChatbotSettings = async function() {
        try {
          const response = await fetch('/api/admin/chatbot/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              chatbot_enabled: document.getElementById('chatbotEnabled').checked,
              chatbot_name: document.getElementById('chatbotName').value,
              chatbot_greeting_en: document.getElementById('chatbotGreeting').value
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            alert('✅ Chatbot settings saved successfully!');
          } else {
            alert('❌ Failed to save settings: ' + data.error);
          }
        } catch (error) {
          console.error('Save settings error:', error);
          alert('❌ Error saving settings');
        }
      };
      
      // Add document form handler
      document.getElementById('addDocumentForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('docTitle').value;
        const content = document.getElementById('docContent').value;
        const type = document.getElementById('docType').value;
        
        if (!title || !content) {
          alert('Please fill in all required fields');
          return;
        }
        
        try {
          const response = await fetch('/api/admin/chatbot/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: 1,
              title: title,
              content: content,
              document_type: type
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            alert('✅ Document added successfully!\\n' + data.chunks_created + ' text chunks created for AI search.');
            document.getElementById('addDocumentForm').reset();
            await loadChatbotDocuments();
          } else {
            alert('❌ Failed to add document: ' + data.error);
          }
        } catch (error) {
          console.error('Add document error:', error);
          alert('❌ Error adding document');
        }
      });
      
      window.deleteChatbotDocument = async function(documentId) {
        if (!confirm('Are you sure you want to delete this document? This will also remove all its text chunks.')) {
          return;
        }
        
        try {
          const response = await fetch('/api/admin/chatbot/documents/' + documentId, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          
          if (data.success) {
            alert('✅ Document deleted successfully!');
            await loadChatbotDocuments();
          } else {
            alert('❌ Failed to delete document');
          }
        } catch (error) {
          console.error('Delete document error:', error);
          alert('❌ Error deleting document');
        }
      };
      
      async function renderSectionVisibility() {
        // Load custom sections
        let customSections = [];
        try {
          const response = await fetch('/api/admin/custom-sections?property_id=1');
          const data = await response.json();
          customSections = data.sections || [];
        } catch (error) {
          console.error('Failed to load custom sections for visibility:', error);
        }
        
        const defaultSections = [
          { key: 'restaurants', icon: '🍽️', name: 'Restaurants' },
          { key: 'events', icon: '🎉', name: 'Events' },
          { key: 'spa', icon: '💆', name: 'Spa' },
          { key: 'service', icon: '🛎️', name: 'Services' },
          { key: 'activities', icon: '🏃', name: 'Activities' }
        ];
        
        const grid = document.getElementById('sectionVisibilityGrid');
        grid.innerHTML = '';
        
        // Render default sections
        defaultSections.forEach(section => {
          const label = document.createElement('label');
          label.className = 'flex items-center cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition';
          label.innerHTML = \`
            <input type="checkbox" id="show\${section.key.charAt(0).toUpperCase() + section.key.slice(1)}" 
                   class="mr-2 w-4 h-4" checked data-section-key="\${section.key}" />
            <span class="text-sm font-medium">\${section.icon} \${section.name}</span>
          \`;
          grid.appendChild(label);
        });
        
        // Render custom sections
        customSections.forEach(section => {
          const label = document.createElement('label');
          label.className = 'flex items-center cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition';
          const icon = section.icon_class ? \`<i class="\${section.icon_class} mr-1"></i>\` : '✨ ';
          label.innerHTML = \`
            <input type="checkbox" id="showCustom\${section.section_id}" 
                   class="mr-2 w-4 h-4" checked data-section-key="\${section.section_key}" 
                   data-custom="true" data-section-id="\${section.section_id}" />
            <span class="text-sm font-medium">\${icon}\${section.section_name_en}</span>
          \`;
          grid.appendChild(label);
        });
      }
      
      async function renderSectionOrder(order) {
        // Load custom sections first
        let customSections = [];
        try {
          const response = await fetch('/api/admin/custom-sections?property_id=1');
          const data = await response.json();
          customSections = data.sections || [];
        } catch (error) {
          console.error('Failed to load custom sections for ordering:', error);
        }
        
        const sectionNames = {
          'restaurants': '🍽️ Restaurants',
          'events': '🎉 Events',
          'spa': '💆 Spa & Wellness',
          'service': '🛎️ Hotel Services',
          'activities': '🏃 Activities & Experiences'
        };
        
        // Add custom sections to sectionNames
        customSections.forEach(cs => {
          sectionNames[cs.section_key] = cs.icon_class ? 
            '<i class="' + cs.icon_class + ' mr-1"></i>' + cs.section_name_en :
            '✨ ' + cs.section_name_en;
        });
        
        // Add any custom sections that aren't in the order yet
        customSections.forEach(cs => {
          if (!order.includes(cs.section_key)) {
            order.push(cs.section_key);
          }
        });
        
        const list = document.getElementById('sectionOrderList');
        list.innerHTML = '';
        
        order.forEach((section, index) => {
          const item = document.createElement('div');
          item.className = 'flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-300 cursor-move hover:border-purple-400 transition';
          item.draggable = true;
          item.dataset.section = section;
          
          const displayName = sectionNames[section] || '❓ ' + section;
          item.innerHTML = '<i class="fas fa-grip-vertical text-gray-400"></i>' +
                          '<span class="flex-1 font-medium">' + (index + 1) + '. ' + displayName + '</span>' +
                          '<i class="fas fa-arrows-alt-v text-gray-400"></i>';
          
          // Drag events
          item.addEventListener('dragstart', handleDragStart);
          item.addEventListener('dragover', handleDragOver);
          item.addEventListener('drop', handleDrop);
          item.addEventListener('dragend', handleDragEnd);
          
          list.appendChild(item);
        });
      }
      
      let draggedElement = null;
      
      function handleDragStart(e) {
        draggedElement = this;
        this.style.opacity = '0.5';
      }
      
      function handleDragOver(e) {
        e.preventDefault();
        return false;
      }
      
      function handleDrop(e) {
        e.preventDefault();
        if (draggedElement !== this) {
          const allItems = Array.from(document.getElementById('sectionOrderList').children);
          const draggedIndex = allItems.indexOf(draggedElement);
          const targetIndex = allItems.indexOf(this);
          
          if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
          } else {
            this.parentNode.insertBefore(draggedElement, this);
          }
          
          updateSectionNumbers();
        }
        return false;
      }
      
      function handleDragEnd() {
        this.style.opacity = '1';
        draggedElement = null;
      }
      
      function updateSectionNumbers() {
        const items = document.getElementById('sectionOrderList').children;
        Array.from(items).forEach((item, index) => {
          const span = item.querySelector('span');
          const text = span.textContent;
          span.textContent = (index + 1) + text.substring(text.indexOf('.'));
        });
      }
      
      function getSectionOrder() {
        const items = document.getElementById('sectionOrderList').children;
        return Array.from(items).map(item => item.dataset.section);
      }
      
      function updateGradientPreview() {
        const primary = document.getElementById('primaryColorText').value || '#3B82F6';
        const secondary = document.getElementById('secondaryColorText').value || '#10B981';
        const preview = document.getElementById('primaryGradientPreview');
        preview.style.background = 'linear-gradient(135deg, ' + primary + ', ' + secondary + ')';
      }
      
      function copyHomepageUrl() {
        const input = document.getElementById('homepageUrl');
        input.select();
        document.execCommand('copy');
        alert('Homepage URL copied to clipboard!');
      }
      
      function previewDesign() {
        const homepageUrl = document.getElementById('visitHomepage').href;
        window.open(homepageUrl, '_blank');
      }
      
      document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const layoutStyle = document.querySelector('input[name="layoutStyle"]:checked').value;
        const heroEffect = document.querySelector('input[name="heroImageEffect"]:checked').value;
        
        const settings = {
          property_id: 1,
          name: document.getElementById('hotelName').value,
          tagline: document.getElementById('hotelTagline').value,
          contact_email: document.getElementById('hotelEmail').value,
          contact_phone: document.getElementById('hotelPhone').value,
          address: document.getElementById('hotelAddress').value,
          section_restaurants_en: document.getElementById('sectionNameRestaurants').value || null,
          section_events_en: document.getElementById('sectionNameEvents').value || null,
          section_spa_en: document.getElementById('sectionNameSpa').value || null,
          section_service_en: document.getElementById('sectionNameService').value || null,
          section_activities_en: document.getElementById('sectionNameActivities').value || null,
          brand_logo_url: document.getElementById('brandLogoUrl').value,
          hero_image_url: document.getElementById('heroImageUrl').value,
          hero_image_effect: heroEffect,
          hero_overlay_opacity: parseInt(document.getElementById('heroOverlayOpacity').value),
          primary_color: document.getElementById('primaryColorText').value,
          secondary_color: document.getElementById('secondaryColorText').value,
          accent_color: document.getElementById('accentColorText').value,
          layout_style: layoutStyle,
          font_family: document.getElementById('fontFamily').value,
          button_style: document.getElementById('buttonStyle').value,
          card_style: document.getElementById('cardStyle').value,
          header_style: document.getElementById('headerStyle').value,
          use_gradient: document.getElementById('primaryGradient').checked ? 1 : 0,
          hotel_map_url: document.getElementById('hotelMapUrl').value,
          show_hotel_map: document.getElementById('showHotelMap').checked ? 1 : 0,
          show_restaurants: document.getElementById('showRestaurants').checked ? 1 : 0,
          show_events: document.getElementById('showEvents').checked ? 1 : 0,
          show_spa: document.getElementById('showSpa').checked ? 1 : 0,
          show_service: document.getElementById('showService').checked ? 1 : 0,
          show_activities: document.getElementById('showActivities').checked ? 1 : 0,
          homepage_section_order: JSON.stringify(getSectionOrder())
        };
        
        try {
          // Save main settings
          const response = await fetch('/api/admin/property-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          });
          
          if (!response.ok) {
            alert('Failed to save settings');
            return;
          }
          
          // Save custom section visibility
          const customCheckboxes = document.querySelectorAll('#sectionVisibilityGrid input[data-custom="true"]');
          for (const checkbox of customCheckboxes) {
            const sectionId = checkbox.getAttribute('data-section-id');
            const isVisible = checkbox.checked ? 1 : 0;
            
            await fetch('/api/admin/custom-sections/' + sectionId, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                is_visible: isVisible
              })
            });
          }
          
          alert('Design settings saved successfully! Visit your homepage to see the changes.');
        } catch (error) {
          console.error('Save settings error:', error);
          alert('Failed to save settings');
        }
      });

      // Dark mode toggle
      function toggleDarkMode() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        
        if (isDark) {
          html.classList.remove('dark');
          localStorage.setItem('adminDarkMode', 'false');
          document.getElementById('darkModeIcon').className = 'fas fa-moon';
          document.getElementById('darkModeText').textContent = 'Dark';
        } else {
          html.classList.add('dark');
          localStorage.setItem('adminDarkMode', 'true');
          document.getElementById('darkModeIcon').className = 'fas fa-sun';
          document.getElementById('darkModeText').textContent = 'Light';
        }
      }
      
      // Initialize dark mode from localStorage
      function initDarkMode() {
        const darkMode = localStorage.getItem('adminDarkMode');
        if (darkMode === 'true') {
          document.documentElement.classList.add('dark');
          document.getElementById('darkModeIcon').className = 'fas fa-sun';
          document.getElementById('darkModeText').textContent = 'Light';
        }
      }
      
      // Apply dark mode immediately
      initDarkMode();

      // Support Ticket Functions
      function openSupportModal() {
        document.getElementById('supportModal').classList.remove('hidden');
      }
      
      function closeSupportModal() {
        document.getElementById('supportModal').classList.add('hidden');
        document.getElementById('supportTicketForm').reset();
      }
      
      document.getElementById('supportTicketForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
          const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: document.getElementById('ticketSubject').value,
              description: document.getElementById('ticketDescription').value,
              priority: document.getElementById('ticketPriority').value,
              category: document.getElementById('ticketCategory').value,
              created_by_type: 'hotel',
              created_by_id: user.property_id || 1,
              created_by_email: user.email || 'admin@hotel.com',
              created_by_name: user.name || 'Hotel Admin',
              property_id: user.property_id || 1
            })
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Support ticket created! Ticket #: ' + data.ticket_number + '. Our team will respond soon.');
            closeSupportModal();
          } else {
            alert('Failed to create ticket: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Create ticket error:', error);
          alert('Failed to create support ticket');
        }
      });
      
      // Live Chat Functions
      let widgetChatRoomId = null;
      let widgetChatInterval = null;
      
      async function openLiveChat() {
        document.getElementById('chatWidget').classList.remove('hidden');
        
        // Get or create chat room with super admin
        try {
          const response = await fetch('/api/chat/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_type: 'hotel_support',
              room_name: 'Hotel Support Chat',
              participant1_type: 'hotel',
              participant1_id: user.property_id || 1,
              participant1_name: user.name || 'Hotel Admin',
              property_id: user.property_id || 1
            })
          });
          
          const data = await response.json();
          if (data.success) {
            widgetChatRoomId = data.room_id;
            loadWidgetMessages();
            
            // Auto-refresh messages every 3 seconds
            if (widgetChatInterval) clearInterval(widgetChatInterval);
            widgetChatInterval = setInterval(loadWidgetMessages, 3000);
          }
        } catch (error) {
          console.error('Open chat error:', error);
        }
      }
      
      function closeLiveChat() {
        document.getElementById('chatWidget').classList.add('hidden');
        if (widgetChatInterval) clearInterval(widgetChatInterval);
      }
      
      async function loadWidgetMessages() {
        if (!widgetChatRoomId) return;
        
        try {
          const response = await fetch('/api/chat/rooms/' + widgetChatRoomId + '/messages?limit=50');
          const data = await response.json();
          const messages = data.messages || [];
          
          const html = messages.map(msg => {
            const isMe = msg.sender_type === 'hotel';
            return '<div class="flex ' + (isMe ? 'justify-end' : 'justify-start') + ' mb-3">' +
              '<div class="max-w-[80%] ' + (isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800') + ' px-3 py-2 rounded-lg">' +
                '<div class="text-xs mb-1 ' + (isMe ? 'text-blue-200' : 'text-gray-500') + '">' +
                  msg.sender_name + ' · ' + new Date(msg.created_at).toLocaleTimeString() +
                '</div>' +
                '<div class="text-sm">' + msg.message + '</div>' +
              '</div>' +
            '</div>';
          }).join('');
          
          const container = document.getElementById('widgetChatMessages');
          container.innerHTML = html || '<div class="text-center text-gray-500 text-sm">No messages yet. Start the conversation!</div>';
          container.scrollTop = container.scrollHeight;
        } catch (error) {
          console.error('Load widget messages error:', error);
        }
      }
      
      async function sendWidgetMessage() {
        const input = document.getElementById('widgetChatInput');
        const message = input.value.trim();
        if (!message || !widgetChatRoomId) return;
        
        try {
          const response = await fetch('/api/chat/rooms/' + widgetChatRoomId + '/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              sender_type: 'hotel',
              sender_id: user.property_id || 1,
              sender_name: user.name || 'Hotel Admin'
            })
          });
          
          if (response.ok) {
            input.value = '';
            loadWidgetMessages();
          }
        } catch (error) {
          console.error('Send message error:', error);
        }
      }
      
      // Allow Enter key to send messages
      document.getElementById('widgetChatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendWidgetMessage();
        }
      });

      // ============================================
      // SEASONAL EFFECTS FUNCTIONS
      // ============================================
      let seasonalSettings = {};
      
      async function loadSeasonalSettings() {
        try {
          const response = await fetch('/api/seasonal-settings/1');
          const data = await response.json();
          if (data.success) {
            seasonalSettings = data.settings;
            populateSeasonalForm(seasonalSettings);
          }
        } catch (error) {
          console.error('Load seasonal settings error:', error);
        }
      }
      
      function populateSeasonalForm(settings) {
        // Set theme
        document.querySelector('input[name="theme"][value="' + (settings.active_theme || 'none') + '"]').checked = true;
        updateThemeSelection();
        
        // Set effects
        document.getElementById('enableSnow').checked = settings.enable_snow === 1;
        document.getElementById('enableFireworks').checked = settings.enable_fireworks === 1;
        document.getElementById('enableConfetti').checked = settings.enable_confetti === 1;
        document.getElementById('enableLights').checked = settings.enable_lights === 1;
        
        // Set overlay
        document.getElementById('enableOverlay').checked = settings.enable_overlay === 1;
        if (settings.enable_overlay && settings.overlay_type) {
          document.querySelector('input[name="overlay"][value="' + settings.overlay_type + '"]').checked = true;
          document.getElementById('overlayOptions').classList.remove('hidden');
        }
        
        // Set message
        document.getElementById('customMessage').value = settings.custom_message || '';
        
        // Set active status
        document.getElementById('isActive').checked = settings.is_active === 1;
      }
      
      function updateThemeSelection() {
        document.querySelectorAll('.theme-card').forEach(card => {
          card.classList.remove('border-blue-500', 'bg-blue-50');
        });
        const selected = document.querySelector('input[name="theme"]:checked');
        if (selected) {
          selected.closest('.theme-option').querySelector('.theme-card').classList.add('border-blue-500', 'bg-blue-50');
        }
      }
      
      // Theme selection handler
      document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', updateThemeSelection);
      });
      
      // Overlay toggle handler
      document.getElementById('enableOverlay').addEventListener('change', (e) => {
        if (e.target.checked) {
          document.getElementById('overlayOptions').classList.remove('hidden');
        } else {
          document.getElementById('overlayOptions').classList.add('hidden');
        }
      });
      
      // Overlay selection handler
      document.querySelectorAll('.overlay-choice').forEach(choice => {
        choice.addEventListener('click', () => {
          document.querySelectorAll('.overlay-choice div').forEach(div => {
            div.classList.remove('border-blue-500', 'bg-blue-50');
          });
          choice.querySelector('div').classList.add('border-blue-500', 'bg-blue-50');
        });
      });
      
      function applyPreset(preset) {
        // Reset all
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        if (preset === 'none') {
          document.querySelector('input[name="theme"][value="none"]').checked = true;
          document.getElementById('customMessage').value = '';
        } else if (preset === 'christmas') {
          document.querySelector('input[name="theme"][value="christmas"]').checked = true;
          document.getElementById('enableSnow').checked = true;
          document.getElementById('enableLights').checked = true;
          document.getElementById('enableOverlay').checked = true;
          document.getElementById('overlayOptions').classList.remove('hidden');
          document.querySelector('input[name="overlay"][value="santa_hat"]').checked = true;
          document.getElementById('customMessage').value = 'Merry Christmas! 🎄✨';
          document.getElementById('isActive').checked = true;
        } else if (preset === 'newyear') {
          document.querySelector('input[name="theme"][value="newyear"]').checked = true;
          document.getElementById('enableFireworks').checked = true;
          document.getElementById('enableConfetti').checked = true;
          document.getElementById('enableOverlay').checked = true;
          document.getElementById('overlayOptions').classList.remove('hidden');
          document.querySelector('input[name="overlay"][value="party_hat"]').checked = true;
          document.getElementById('customMessage').value = 'Happy New Year! 🎆🥳';
          document.getElementById('isActive').checked = true;
        } else if (preset === 'ramadan') {
          document.querySelector('input[name="theme"][value="ramadan"]').checked = true;
          document.getElementById('enableLights').checked = true;
          document.getElementById('customMessage').value = 'Ramadan Kareem! 🌙⭐';
          document.getElementById('isActive').checked = true;
        } else if (preset === 'eid') {
          document.querySelector('input[name="theme"][value="eid"]').checked = true;
          document.getElementById('enableConfetti').checked = true;
          document.getElementById('enableLights').checked = true;
          document.getElementById('customMessage').value = 'Eid Mubarak! ⭐🌙';
          document.getElementById('isActive').checked = true;
        }
        
        updateThemeSelection();
      }
      
      function previewSeasonalEffects() {
        const theme = document.querySelector('input[name="theme"]:checked').value;
        const message = document.getElementById('customMessage').value;
        
        // Open hotel page in new tab with preview parameter
        const previewUrl = '/hotel/paradise-resort?preview=seasonal&theme=' + theme + '&message=' + encodeURIComponent(message);
        window.open(previewUrl, '_blank');
      }
      
      document.getElementById('seasonalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const overlayEnabled = document.getElementById('enableOverlay').checked;
        const overlayType = overlayEnabled ? document.querySelector('input[name="overlay"]:checked')?.value : null;
        
        const data = {
          active_theme: document.querySelector('input[name="theme"]:checked').value,
          is_active: document.getElementById('isActive').checked,
          enable_snow: document.getElementById('enableSnow').checked,
          enable_fireworks: document.getElementById('enableFireworks').checked,
          enable_confetti: document.getElementById('enableConfetti').checked,
          enable_lights: document.getElementById('enableLights').checked,
          enable_overlay: overlayEnabled,
          overlay_type: overlayType,
          custom_message: document.getElementById('customMessage').value
        };
        
        try {
          const response = await fetch('/api/admin/seasonal-settings/1', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          const result = await response.json();
          if (result.success) {
            alert('✨ Seasonal settings saved! Visit your hotel page to see the effects.');
            loadSeasonalSettings();
          } else {
            alert('Failed to save settings: ' + (result.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Save seasonal settings error:', error);
          alert('Failed to save seasonal settings');
        }
      });
      
      // Load seasonal settings when settings tab is opened
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.tab === 'settings') {
            loadSeasonalSettings();
          }
        });
      });

      function logout() {
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
      }

      // AI Proofreading function
      async function proofreadText(textareaId, userType) {
        const textarea = document.getElementById(textareaId);
        const text = textarea.value.trim();
        
        if (!text) {
          alert('Please enter some text first!');
          return;
        }
        
        if (text.length > 5000) {
          alert('Text is too long! Maximum 5000 characters allowed.');
          return;
        }
        
        // Get user ID
        const userId = userType === 'vendor' ? 
          localStorage.getItem('vendor_id') : 
          localStorage.getItem('property_id');
        
        if (!userId) {
          alert('User session not found. Please log in again.');
          return;
        }
        
        // Show loading state
        const originalText = textarea.value;
        textarea.value = '✨ AI is proofreading your text...';
        textarea.disabled = true;
        
        try {
          const response = await fetch('/api/ai/proofread', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: originalText,
              user_id: userId,
              user_type: userType
            })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Show success
            textarea.value = data.proofread_text;
            textarea.disabled = false;
            
            // Show usage stats
            const usageMsg = \`✅ Proofreading complete!\\n\\n📊 Your usage: \${data.usage.used}/\${data.usage.limit} today\\n(\${data.usage.remaining} remaining)\\n⚡ Processed in \${data.processing_time_ms}ms\`;
            
            if (data.model_used === 'fallback') {
              alert(usageMsg + '\\n\\n⚠️ Note: AI service is currently unavailable. Basic formatting applied.');
            } else {
              alert(usageMsg);
            }
          } else {
            // Handle errors
            textarea.value = originalText;
            textarea.disabled = false;
            
            if (response.status === 429) {
              if (data.wait_seconds) {
                alert(\`⏳ \${data.message}\\n\\nPlease wait \${data.wait_seconds} seconds before trying again.\`);
              } else {
                alert(\`🚫 \${data.message}\\n\\nYou've used \${data.used}/\${data.limit} requests today.\`);
              }
            } else {
              alert('❌ Error: ' + (data.error || 'Failed to proofread text'));
            }
          }
        } catch (error) {
          textarea.value = originalText;
          textarea.disabled = false;
          alert('❌ Network error. Please check your connection and try again.');
          console.error('Proofread error:', error);
        }
      }

      loadRooms();
    </script>
</body>
</html>
  `)
})

// ============================================
// DEFAULT ROUTE - Guest Landing Page
// ============================================

// Property-specific homepage
app.get('/:property_slug?', async (c) => {
  const { DB } = c.env
  const property_slug = c.req.param('property_slug') || 'paradise-resort'
  
  try {
    const property = await DB.prepare(`
      SELECT * FROM properties WHERE slug = ? AND status = 'active'
    `).bind(property_slug).first()
    
    if (!property) {
      return c.html('<html><body><h1>Property not found</h1><p>Please check the URL or visit <a href="/">homepage</a></p></body></html>', 404)
    }
    
    const primaryColor = property.primary_color || '#0EA5E9'
    const secondaryColor = property.secondary_color || '#10B981'
    
    return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${property.name} - Activity Booking</title>
        <meta name="description" content="Book amazing resort activities instantly">
        <link rel="manifest" href="/static/manifest.json">
        <meta name="theme-color" content="${primaryColor}">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="gradient-bg text-white py-20 px-4">
                <div class="max-w-4xl mx-auto text-center">
                    <i class="fas fa-umbrella-beach text-6xl mb-6"></i>
                    <h1 class="text-5xl font-bold mb-4">${property.name}</h1>
                    <p class="text-xl mb-8">Discover & Book Amazing Activities</p>
                    <div class="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
                        <i class="fas fa-qrcode text-4xl mb-4"></i>
                        <p class="text-lg mb-2">Scan the QR code in your room</p>
                        <div class="mt-4 space-y-2">
                            <a href="/browse?property=${property.property_id}" class="block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">Browse All Activities</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Features Section -->
            <div class="max-w-6xl mx-auto py-16 px-4">
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="text-center p-6">
                        <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-water text-blue-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Water Sports</h3>
                        <p class="text-gray-600">Diving, snorkeling, and more aquatic adventures</p>
                    </div>
                    <div class="text-center p-6">
                        <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-spa text-green-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Spa & Wellness</h3>
                        <p class="text-gray-600">Relax with massages and beauty treatments</p>
                    </div>
                    <div class="text-center p-6">
                        <div class="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-binoculars text-yellow-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Desert Safari</h3>
                        <p class="text-gray-600">Explore the desert with thrilling adventures</p>
                    </div>
                </div>
            </div>

            <!-- How It Works -->
            <div class="bg-white py-16 px-4">
                <div class="max-w-4xl mx-auto">
                    <h2 class="text-3xl font-bold text-center mb-12">How It Works</h2>
                    <div class="space-y-8">
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Scan QR Code</h3>
                                <p class="text-gray-600">Use your phone camera to scan the QR code in your room</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Browse Activities</h3>
                                <p class="text-gray-600">Explore diving, spa, safari, and dining options</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Book Instantly</h3>
                                <p class="text-gray-600">Choose date & time, pay online or at venue, get instant confirmation</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4">
                            <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</div>
                            <div>
                                <h3 class="text-xl font-bold mb-2">Enjoy!</h3>
                                <p class="text-gray-600">Show your confirmation and have an amazing experience</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <footer class="bg-gray-800 text-white py-8 px-4">
                <div class="max-w-4xl mx-auto text-center">
                    <p class="mb-3">© 2025 ${property.name}. All rights reserved.</p>
                    <div class="mb-3 flex justify-center gap-4">
                        <a href="/vendor/login" class="text-sm text-blue-400 hover:text-blue-300"><i class="fas fa-store mr-1"></i>Vendor Login</a>
                        <a href="/admin/login" class="text-sm text-blue-400 hover:text-blue-300"><i class="fas fa-shield-alt mr-1"></i>Admin Login</a>
                    </div>
                    <p class="text-sm text-gray-400">
                        <a href="#" class="hover:text-white">Privacy Policy</a> | 
                        <a href="#" class="hover:text-white">Terms of Service</a> | 
                        <a href="mailto:info@paradiseresort.com" class="hover:text-white">Contact Us</a>
                    </p>
                </div>
            </footer>
        </div>
    </body>
    </html>
  `)
  } catch (error) {
    console.error('Homepage error:', error)
    return c.html('<html><body><h1>Error</h1><p>Failed to load homepage</p></body></html>', 500)
  }
})

// Restaurant Table Management Page
app.get('/admin/restaurant/:offering_id', (c) => {
  const { offering_id } = c.req.param()
  
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurant Table Management</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      .table-item {
        position: absolute;
        cursor: move;
        border: 2px solid #3B82F6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        user-select: none;
      }
      .table-item:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
      .table-item.selected { border-color: #10B981; border-width: 3px; }
      .table-rectangle { border-radius: 8px; }
      .table-circle { border-radius: 50%; }
      .table-square { border-radius: 8px; }
      #canvas { position: relative; background: #F3F4F6; border: 2px dashed #9CA3AF; }
    </style>
</head>
<body class="bg-gray-50">
    <div class="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-4 px-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div class="flex items-center gap-4">
                <a href="/admin/dashboard" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
                    <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                </a>
                <h1 class="text-2xl font-bold">Restaurant Table Management</h1>
            </div>
            <span id="restaurantName" class="text-lg"></span>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid md:grid-cols-3 gap-6">
            <!-- Left Panel: Table Controls -->
            <div class="space-y-6">
                <!-- Add Table Form -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4"><i class="fas fa-plus-circle mr-2 text-blue-600"></i>Add Table</h2>
                    <form id="addTableForm" class="space-y-3">
                        <input type="text" id="tableNumber" placeholder="Table Number (e.g., T1)" required class="w-full px-3 py-2 border rounded-lg text-sm">
                        <input type="text" id="tableName" placeholder="Table Name (optional)" class="w-full px-3 py-2 border rounded-lg text-sm">
                        <input type="number" id="capacity" placeholder="Capacity" required min="1" max="12" class="w-full px-3 py-2 border rounded-lg text-sm">
                        
                        <select id="shape" class="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="rectangle">Rectangle</option>
                            <option value="circle">Circle</option>
                            <option value="square">Square</option>
                        </select>
                        
                        <select id="tableType" class="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="standard">Standard</option>
                            <option value="booth">Booth</option>
                            <option value="bar">Bar/High-Top</option>
                            <option value="outdoor">Outdoor</option>
                            <option value="vip">VIP</option>
                        </select>
                        
                        <div class="border rounded-lg p-2 max-h-32 overflow-y-auto">
                            <p class="text-xs font-semibold mb-2">Features:</p>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="window_view" class="mr-2">Window View</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="beachfront" class="mr-2">Beachfront</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="sunset_view" class="mr-2">Sunset View</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="quiet" class="mr-2">Quiet Section</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="couples" class="mr-2">Couples</label>
                            <label class="flex items-center text-sm mb-1"><input type="checkbox" name="features" value="family_friendly" class="mr-2">Family Friendly</label>
                        </div>
                        
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add to Floor Plan
                        </button>
                    </form>
                </div>

                <!-- Selected Table Info -->
                <div id="selectedTableInfo" class="bg-white rounded-lg shadow-lg p-6 hidden">
                    <h2 class="text-xl font-bold mb-4"><i class="fas fa-info-circle mr-2 text-green-600"></i>Selected Table</h2>
                    <div id="tableDetails"></div>
                    <div class="flex gap-2 mt-4">
                        <button onclick="deleteSelectedTable()" class="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                            <i class="fas fa-trash mr-2"></i>Delete
                        </button>
                    </div>
                </div>

                <!-- Tables List -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">All Tables (<span id="tableCount">0</span>)</h2>
                    <div id="tablesList" class="space-y-2 max-h-64 overflow-y-auto"></div>
                </div>
            </div>

            <!-- Center: Floor Plan Canvas -->
            <div class="md:col-span-2">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold"><i class="fas fa-th mr-2 text-purple-600"></i>Floor Plan Designer</h2>
                        <div class="flex gap-2">
                            <button onclick="saveLayout()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-save mr-2"></i>Save Layout
                            </button>
                            <button onclick="clearCanvas()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                                <i class="fas fa-eraser mr-2"></i>Clear
                            </button>
                        </div>
                    </div>
                    
                    <div id="canvas" style="width: 100%; height: 600px; overflow: auto;"></div>
                    
                    <div class="mt-4 flex items-center justify-between text-sm text-gray-600">
                        <span><i class="fas fa-chair mr-2"></i>Drag tables to position them</span>
                        <span>Total Capacity: <strong id="totalCapacity">0</strong> seats</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
      const offeringId = '${offering_id}';
      let tables = [];
      let selectedTable = null;
      let isDragging = false;
      let dragOffset = { x: 0, y: 0 };

      async function init() {
        await loadRestaurant();
        await loadTables();
      }

      async function loadRestaurant() {
        try {
          const response = await fetch('/api/hotel-offerings/1');
          const data = await response.json();
          const restaurant = data.offerings.find(o => o.offering_id == offeringId);
          if (restaurant) {
            document.getElementById('restaurantName').textContent = restaurant.title;
            document.title = \`\${restaurant.title} - Table Management\`;
          }
        } catch (error) {
          console.error('Load restaurant error:', error);
        }
      }

      async function loadTables() {
        try {
          const response = await fetch('/api/restaurant/' + offeringId + '/tables');
          const data = await response.json();
          tables = data.tables || [];
          renderTables();
          updateTablesList();
        } catch (error) {
          console.error('Load tables error:', error);
        }
      }

      function renderTables() {
        const canvas = document.getElementById('canvas');
        canvas.innerHTML = '';
        
        let totalCap = 0;
        
        tables.forEach(table => {
          totalCap += table.capacity;
          const div = document.createElement('div');
          div.className = \`table-item table-\${table.shape}\`;
          div.id = \`table-\${table.table_id}\`;
          div.style.left = table.position_x + 'px';
          div.style.top = table.position_y + 'px';
          div.style.width = table.width + 'px';
          div.style.height = table.height + 'px';
          div.innerHTML = \`<div class="text-center"><div class="text-sm">\${table.table_number}</div><div class="text-xs text-gray-600">\${table.capacity}p</div></div>\`;
          
          div.addEventListener('mousedown', (e) => startDrag(e, table));
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            selectTable(table);
          });
          
          canvas.appendChild(div);
        });
        
        document.getElementById('tableCount').textContent = tables.length;
        document.getElementById('totalCapacity').textContent = totalCap;
      }

      function startDrag(e, table) {
        e.preventDefault();
        isDragging = true;
        selectedTable = table;
        const div = document.getElementById(\`table-\${table.table_id}\`);
        const rect = div.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
      }

      function onDrag(e) {
        if (!isDragging || !selectedTable) return;
        
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left - dragOffset.x;
        const y = e.clientY - canvasRect.top - dragOffset.y;
        
        selectedTable.position_x = Math.max(0, Math.min(x, canvasRect.width - selectedTable.width));
        selectedTable.position_y = Math.max(0, Math.min(y, canvasRect.height - selectedTable.height));
        
        const div = document.getElementById(\`table-\${selectedTable.table_id}\`);
        div.style.left = selectedTable.position_x + 'px';
        div.style.top = selectedTable.position_y + 'px';
      }

      function stopDrag() {
        if (isDragging && selectedTable) {
          updateTablePosition(selectedTable);
        }
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
      }

      async function updateTablePosition(table) {
        try {
          await fetch('/api/admin/restaurant/table/' + table.table_id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(table)
          });
        } catch (error) {
          console.error('Update position error:', error);
        }
      }

      function selectTable(table) {
        document.querySelectorAll('.table-item').forEach(el => el.classList.remove('selected'));
        document.getElementById(\`table-\${table.table_id}\`).classList.add('selected');
        selectedTable = table;
        
        const infoPanel = document.getElementById('selectedTableInfo');
        const details = document.getElementById('tableDetails');
        
        details.innerHTML = \`
          <div class="space-y-2 text-sm">
            <div><strong>Number:</strong> \${table.table_number}</div>
            <div><strong>Name:</strong> \${table.table_name || 'N/A'}</div>
            <div><strong>Capacity:</strong> \${table.capacity} seats</div>
            <div><strong>Type:</strong> \${table.table_type}</div>
            <div><strong>Shape:</strong> \${table.shape}</div>
            <div><strong>Features:</strong> \${table.features.length > 0 ? table.features.join(', ') : 'None'}</div>
          </div>
        \`;
        
        infoPanel.classList.remove('hidden');
      }

      function updateTablesList() {
        const list = document.getElementById('tablesList');
        list.innerHTML = tables.map(t => \`
          <div class="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer" onclick='selectTable(\${JSON.stringify(t)})'>
            <div>
              <div class="font-semibold text-sm">\${t.table_number}</div>
              <div class="text-xs text-gray-600">\${t.capacity} seats</div>
            </div>
            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">\${t.table_type}</span>
          </div>
        \`).join('');
      }

      document.getElementById('addTableForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const features = Array.from(document.querySelectorAll('input[name="features"]:checked')).map(cb => cb.value);
        
        try {
          const response = await fetch('/api/admin/restaurant/table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              offering_id: offeringId,
              table_number: document.getElementById('tableNumber').value,
              table_name: document.getElementById('tableName').value || null,
              capacity: parseInt(document.getElementById('capacity').value),
              shape: document.getElementById('shape').value,
              table_type: document.getElementById('tableType').value,
              features: features,
              position_x: 50,
              position_y: 50,
              width: document.getElementById('shape').value === 'circle' ? 100 : 120,
              height: document.getElementById('shape').value === 'circle' ? 100 : 80
            })
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Table added successfully!');
            document.getElementById('addTableForm').reset();
            await loadTables();
          }
        } catch (error) {
          console.error('Add table error:', error);
          alert('Failed to add table');
        }
      });

      async function deleteSelectedTable() {
        if (!selectedTable) return;
        if (!confirm(\`Delete table \${selectedTable.table_number}?\`)) return;
        
        try {
          const response = await fetch('/api/admin/restaurant/table/' + selectedTable.table_id, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Table deleted!');
            selectedTable = null;
            document.getElementById('selectedTableInfo').classList.add('hidden');
            await loadTables();
          }
        } catch (error) {
          console.error('Delete table error:', error);
          alert('Failed to delete table');
        }
      }

      function saveLayout() {
        alert('Layout auto-saves when you move tables!');
      }

      function clearCanvas() {
        if (!confirm('Delete all tables? This cannot be undone.')) return;
        // Implementation for bulk delete
        alert('Please delete tables individually for now');
      }

      init();
    </script>
</body>
</html>
  `)
})

export default app
