"use client"

import { Download, Chrome, FolderOpen, Settings, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LandingPage() {
  const handleDownload = () => {
    // Check if the ZIP file exists at the expected public path
    fetch("/dopaminediner-extension.zip", { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          // File exists, trigger download
          const link = document.createElement("a")
          link.href = "/dopaminediner-extension.zip"
          link.download = "dopaminediner-extension.zip"
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } else {
          alert("Extension ZIP file not found. Please ensure dopaminediner-extension.zip is in your public directory.")
        }
      })
      .catch(() => {
        alert("Extension ZIP file not found. Please ensure dopaminediner-extension.zip is in your public directory.")
      })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Decorative background elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-orange-200/30 blur-xl"></div>
            <div className="absolute right-1/4 top-1/3 h-24 w-24 rounded-full bg-amber-200/40 blur-xl"></div>
            <div className="absolute bottom-1/4 left-1/3 h-28 w-28 rounded-full bg-yellow-200/30 blur-xl"></div>
          </div>

          <div className="mb-8">
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              🍽️ Dopamine Diner
            </h1>
            <p className="text-xl text-gray-600 sm:text-2xl lg:text-3xl">Gamify your scrolling. Nourish your mind.</p>
          </div>

          <Button
            onClick={handleDownload}
            size="lg"
            className="mb-12 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-lg font-semibold text-white shadow-lg transition-all hover:from-orange-600 hover:to-amber-600 hover:shadow-xl hover:scale-105"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Extension
          </Button>

          {/* Feature Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <span className="text-2xl">🎮</span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">Gamified Experience</h3>
                <p className="text-sm text-gray-600">
                  Turn mindless scrolling into meaningful engagement with game-like rewards
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <span className="text-2xl">🧠</span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">AI-Powered Summaries</h3>
                <p className="text-sm text-gray-600">
                  Get intelligent content summaries to help you consume information more efficiently
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-2xl">🧘</span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">Mindful Browsing</h3>
                <p className="text-sm text-gray-600">
                  Promote healthier digital habits with mindfulness prompts and usage insights
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card className="rounded-3xl border-0 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8 sm:p-12">
              <h2 className="mb-6 text-3xl font-bold text-gray-900 sm:text-4xl">Transform Your Digital Experience</h2>
              <div className="space-y-4 text-lg leading-relaxed text-gray-700">
                <p>
                  <strong>Dopamine Diner</strong> is a revolutionary Chrome extension that transforms your browsing
                  experience from mindless scrolling into mindful engagement. By gamifying your online interactions, it
                  helps you build healthier digital habits while making the web more rewarding.
                </p>
                <p>
                  The extension uses AI-powered content summaries to help you quickly understand what you're reading,
                  saving time and mental energy. With built-in mindfulness prompts and usage tracking, you'll develop a
                  more conscious relationship with technology.
                </p>
                <p>
                  Whether you're researching, learning, or just browsing, Dopamine Diner ensures every click contributes
                  to your personal growth and well-being.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Installation Instructions */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">Installation Instructions</h2>
            <p className="text-lg text-gray-600">Follow these simple steps to install the Dopamine Diner extension</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                    <Download className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="mb-2 text-center font-semibold text-gray-900">Step 1</h3>
                <p className="text-center text-sm text-gray-600">
                  Download the extension ZIP file using the button above
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <FolderOpen className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <h3 className="mb-2 text-center font-semibold text-gray-900">Step 2</h3>
                <p className="text-center text-sm text-gray-600">Extract the ZIP file to a folder on your computer</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <Chrome className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <h3 className="mb-2 text-center font-semibold text-gray-900">Step 3</h3>
                <p className="text-center text-sm text-gray-600">Open Chrome and go to chrome://extensions/</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <h3 className="mb-2 text-center font-semibold text-gray-900">Step 4</h3>
                <p className="text-center text-sm text-gray-600">Enable "Developer mode" and click "Load unpacked"</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8 rounded-2xl border-0 bg-gradient-to-r from-orange-100 to-amber-100 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-200">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Final Step</h4>
                  <p className="text-sm text-gray-700">
                    Select the extracted folder and click "Select Folder". The extension will be installed and ready to
                    use!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Download Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Card className="rounded-3xl border-0 bg-gradient-to-r from-orange-500 to-amber-500 shadow-2xl">
            <CardContent className="p-8 sm:p-12">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Ready to Transform Your Browsing?</h2>
              <p className="mb-8 text-lg text-orange-100">
                Download Dopamine Diner now and start your journey to mindful, gamified web browsing.
              </p>
              <Button
                onClick={handleDownload}
                size="lg"
                variant="secondary"
                className="h-14 rounded-full bg-white px-8 text-lg font-semibold text-orange-600 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl hover:scale-105"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Extension ZIP
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-200/50 bg-white/50 backdrop-blur-sm px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">🍽️ Dopamine Diner</h3>
              <p className="text-gray-600">Gamify your scrolling. Nourish your mind.</p>
            </div>

            <div className="mb-6 space-y-2 text-sm text-gray-600">
              <p>
                Created with ❤️ by <span className="font-semibold text-gray-900">Your Name</span>
              </p>
              <p>Built with modern web technologies and AI-powered insights</p>
              <p>© 2024 Dopamine Diner. Designed for mindful digital experiences.</p>
            </div>

            <div className="flex justify-center space-x-6 text-xs text-gray-500">
              <span>Privacy-First</span>
              <span>•</span>
              <span>Open Source</span>
              <span>•</span>
              <span>Community Driven</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
