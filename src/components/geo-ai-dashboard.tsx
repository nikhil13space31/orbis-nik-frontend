"use client"

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Satellite, Sparkles, Sliders, MapPin, Calendar, BarChart3, Image as ImageIcon, Code, Info, Play, Send } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'

interface AnalysisResult {
  analysis_type: string
  summary_value: string
  date_range: {
    start: string
    end: string
  }
  output_map: {
    center_coords: [number, number]
    tile_url: string
    map_base64_jpg: string
  }
  output_chart: {
    chart_base64_jpg?: string
  }
}

// Component to handle map updates
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

// Component to handle custom tile layer
function CustomTileLayer({ url }: { url: string | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (!url) return
    
    const L = require('leaflet')
    const tileLayer = L.tileLayer(url, {
      attribution: 'Google Earth Engine'
    })
    
    tileLayer.addTo(map)
    
    return () => {
      map.removeLayer(tileLayer)
    }
  }, [url, map])
  
  return null
}

export default function GeoAIDashboard() {
  // Form states
  const [naturalQuery, setNaturalQuery] = useState('')
  const [lon, setLon] = useState(83.2185)
  const [lat, setLat] = useState(17.6868)
  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')
  const [analysisType, setAnalysisType] = useState('NDVI')
  
  // Result states
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawJson, setRawJson] = useState<any>(null)
  
  // Map states
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.0, 0.0])
  const [mapZoom, setMapZoom] = useState(2)
  const [customTileUrl, setCustomTileUrl] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Active tab state for animations
  const [activeTab, setActiveTab] = useState<'gemini' | 'manual' | null>(null)
  
  // Output tab state
  const [outputTab, setOutputTab] = useState<'map' | 'chart'>('map')

  useEffect(() => {
    setMapLoaded(true)
  }, [])

  const showError = (message: string) => {
    setError(message)
    setLoading(false)
  }

  const handleAskGemini = async () => {
    setActiveTab('gemini')
    setLoading(true)
    setError(null)
    setResult(null)
    
    // Let the user know it's a heavy task
    setRawJson("Processing high-resolution imagery... This can take up to 3 minutes. Please do not close this window.") 

    try {
      // 🚨 BYPASS VERCEL: Call Cloud Run directly
      const response = await fetch("https://orbis-nik-backend-864057882351.asia-south1.run.app/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: naturalQuery }),
      })

      const responseText = await response.text()
      let data;
      
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error("Server returned an invalid response. Check Cloud Run logs.")
      }

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Failed to process query")
      }

      // Simulate the live typing effect locally without needing a stream
      const jsonString = JSON.stringify(data, null, 2);
      setRawJson(""); 
      
      // Fast chunked typing effect to prevent React performance lag
      let currentText = "";
      const chunkSize = 20; 
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        currentText += jsonString.slice(i, i + chunkSize);
        setRawJson(currentText);
        await new Promise(r => setTimeout(r, 10)); 
      }

      setResult(data.analysis_result)
      setMapCenter(data.analysis_result.output_map.center_coords)
      setMapZoom(10)
      setCustomTileUrl(data.analysis_result.output_map.tile_url)

      const params = data.parsed_parameters
      setLon(params.lon)
      setLat(params.lat)
      setStartDate(params.start_date)
      setEndDate(params.end_date)
      setAnalysisType(params.analysis_type)

    } catch (err: any) {
      showError(err.message || "An error occurred")
      setRawJson(JSON.stringify({ error: err.message }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  const handleManualAnalysis = async () => {
    setActiveTab('manual')
    setLoading(true)
    setError(null)
    setResult(null)
    
    const requestBody = {
      lon: parseFloat(lon.toString()),
      lat: parseFloat(lat.toString()),
      start_date: startDate,
      end_date: endDate,
      analysis_type: analysisType,
    }
    
    try {
      const response = await fetch("https://orbis-nik-backend-864057882351.asia-south1.run.app", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to analyze')
      }
      
      setResult(data)
      setRawJson(JSON.stringify(data, null, 2)) // Formatted JSON
      setMapCenter(data.output_map.center_coords)
      setMapZoom(10)
      setCustomTileUrl(data.output_map.tile_url)
    } catch (err: any) {
      showError(err.message || 'An error occurred')
      setRawJson(JSON.stringify({ error: err.message }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 dark:from-slate-950 dark:via-purple-950 dark:to-indigo-950"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmurlI#dyaWQiKS8+PC9zdmc+')] opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Instructions Dialog */}
          <div className="flex items-center justify-between border-b-2 border-cyan-400 pb-4 backdrop-blur-sm bg-white/10 dark:bg-black/20 rounded-lg px-6 py-4">
            <div className="flex items-center gap-3">
              <Satellite className="w-10 h-10 text-cyan-400 animate-pulse" />
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                OrbisNik
              </h1>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="bg-white/10 hover:bg-white/20 border-cyan-400/50">
                  <Info className="w-5 h-5 text-cyan-400" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <Info className="w-6 h-6 text-blue-500" />
                    How to Use OrbisNik Dashboard
                  </DialogTitle>
                  <DialogDescription asChild>
                    <div className="space-y-4 text-left pt-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                          <Sparkles className="w-5 h-5 text-purple-500" />
                          Natural Language Query
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Use the "Ask Gemini" feature to analyze satellite data using plain English. Simply describe what you want to see, for example:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                          <li>"Show me vegetation health (NDVI) near Visakhapatnam, India for all of 2024"</li>
                          <li>"Analyze water levels in California from June to August 2024"</li>
                          <li>"Display land cover changes in the Amazon rainforest"</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                          <Sliders className="w-5 h-5 text-blue-500" />
                          Manual Analysis Controls
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          For precise control, use the manual analysis section to specify:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                          <li><strong>Coordinates:</strong> Longitude and Latitude of the area to analyze</li>
                          <li><strong>Date Range:</strong> Start and end dates for the analysis period</li>
                          <li><strong>Analysis Type:</strong> Choose from NDVI, NDWI, EVI, TrueColor, FalseColor, or LULC</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-green-500" />
                          Analysis Types
                        </h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><strong>NDVI:</strong> Normalized Difference Vegetation Index (vegetation health)</li>
                          <li><strong>NDWI:</strong> Normalized Difference Water Index (water bodies)</li>
                          <li><strong>EVI:</strong> Enhanced Vegetation Index (improved vegetation analysis)</li>
                          <li><strong>TrueColor:</strong> Natural color composite</li>
                          <li><strong>FalseColor:</strong> Infrared composite for vegetation</li>
                          <li><strong>LULC:</strong> Land Use Land Cover classification</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                          <MapPin className="w-5 h-5 text-orange-500" />
                          LULC Color Classes
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          When using LULC (Land Use Land Cover) analysis, the result map displays the following color-coded classes:
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { color: '#006400', code: '10', label: 'Trees' },
                            { color: '#ffbb22', code: '20', label: 'Shrubland' },
                            { color: '#ffff4c', code: '30', label: 'Grassland' },
                            { color: '#f096ff', code: '40', label: 'Cropland' },
                            { color: '#fa0000', code: '50', label: 'Built-up' },
                            { color: '#b4b4b4', code: '60', label: 'Barren / sparse vegetation' },
                            { color: '#f0f0f0', code: '70', label: 'Snow and ice' },
                            { color: '#0064c8', code: '80', label: 'Open water' },
                            { color: '#0096a0', code: '90', label: 'Herbaceous wetland' },
                            { color: '#00cf75', code: '95', label: 'Mangroves' },
                            { color: '#fae6a0', code: '100', label: 'Moss and lichen' }
                          ].map((item) => (
                            <div key={item.code} className="flex items-center gap-2 text-sm">
                              <div 
                                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-mono text-xs text-muted-foreground w-8">{item.code}</span>
                              <span className="text-foreground">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Controls Section */}
            <div className="lg:col-span-1 space-y-6">
              {/* Natural Language Query */}
              <Card 
                onClick={() => setActiveTab('gemini')}
                className={`shadow-lg border-2 hover:shadow-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm bg-white/90 dark:bg-black/40 ${
                  activeTab === 'gemini' 
                    ? 'scale-105 border-purple-500 shadow-purple-500/50 ring-4 ring-purple-500/30' 
                    : 'border-purple-300/50 hover:scale-102'
                } animate-in slide-in-from-left duration-500`}
              >
                <CardHeader className="bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                    Ask Gemini
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="natural-query" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Sparkles className="w-4 h-4" />
                      Natural Language Query
                    </Label>
                    <Textarea
                      id="natural-query"
                      placeholder="e.g., 'Show me vegetation health (NDVI) near Visakhapatnam, India for all of 2024'"
                      value={naturalQuery}
                      onChange={(e) => setNaturalQuery(e.target.value)}
                      className="mt-2 min-h-[100px] bg-white/50 dark:bg-black/30"
                    />
                  </div>
                  <Button 
                    onClick={handleAskGemini} 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-transform"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading && activeTab === 'gemini' ? 'Processing...' : 'Ask Gemini'}
                  </Button>
                </CardContent>
              </Card>

              {/* Manual Analysis */}
              <Card 
                onClick={() => setActiveTab('manual')}
                className={`shadow-lg border-2 hover:shadow-2xl transition-all duration-300 cursor-pointer backdrop-blur-sm bg-white/90 dark:bg-black/40 ${
                  activeTab === 'manual' 
                    ? 'scale-105 border-cyan-500 shadow-cyan-500/50 ring-4 ring-cyan-500/30' 
                    : 'border-cyan-300/50 hover:scale-102'
                } animate-in slide-in-from-left duration-500 delay-100`}
              >
                <CardHeader className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Sliders className="w-5 h-5 text-cyan-400 animate-pulse" />
                    Manual Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lon" className="text-slate-700 dark:text-slate-200">Longitude</Label>
                      <Input
                        id="lon"
                        type="number"
                        step="any"
                        value={lon}
                        onChange={(e) => setLon(parseFloat(e.target.value))}
                        className="mt-1 bg-white/50 dark:bg-black/30"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lat" className="text-slate-700 dark:text-slate-200">Latitude</Label>
                      <Input
                        id="lat"
                        type="number"
                        step="any"
                        value={lat}
                        onChange={(e) => setLat(parseFloat(e.target.value))}
                        className="mt-1 bg-white/50 dark:bg-black/30"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="start-date" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Calendar className="w-4 h-4" />
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 bg-white/50 dark:bg-black/30"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="end-date" className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Calendar className="w-4 h-4" />
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 bg-white/50 dark:bg-black/30"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="analysis-type" className="text-slate-700 dark:text-slate-200">Analysis Type</Label>
                    <Select value={analysisType} onValueChange={setAnalysisType}>
                      <SelectTrigger id="analysis-type" className="mt-1 bg-white/50 dark:bg-black/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NDVI">NDVI (Vegetation)</SelectItem>
                        <SelectItem value="NDWI">NDWI (Water)</SelectItem>
                        <SelectItem value="EVI">EVI (Vegetation)</SelectItem>
                        <SelectItem value="TrueColor">TrueColor (Visual)</SelectItem>
                        <SelectItem value="FalseColor">FalseColor (Infrared)</SelectItem>
                        <SelectItem value="LULC">LULC (Land Cover)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleManualAnalysis} 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transform hover:scale-105 transition-transform"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {loading && activeTab === 'manual' ? 'Analyzing...' : 'Run Analysis'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-2 border-cyan-400/50 animate-in slide-in-from-right duration-500 backdrop-blur-sm bg-white/90 dark:bg-black/40">
                <CardHeader className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <BarChart3 className="w-5 h-5 text-cyan-400 animate-pulse" />
                    Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Status Messages */}
                  {loading && (
                    <Alert className="border-cyan-500 bg-cyan-500/20 backdrop-blur-sm animate-pulse">
                      <AlertDescription className="text-slate-800 dark:text-slate-100 font-semibold">
                        🔄 {naturalQuery ? 'Asking Gemini to parse and analyze...' : 'Running manual analysis...'}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {error && (
                    <Alert variant="destructive" className="animate-in slide-in-from-top duration-300 backdrop-blur-sm">
                      <AlertDescription>
                        ⚠️ Error: {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Interactive Map */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-100">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                      Interactive Map
                    </h3>
                    <div className="h-[400px] rounded-lg overflow-hidden border-2 border-cyan-400/50 shadow-md shadow-cyan-500/20">
                      {mapLoaded && (
                        <MapContainer
                          center={mapCenter}
                          zoom={mapZoom}
                          style={{ height: '100%', width: '100%' }}
                          className="z-0"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <MapUpdater center={mapCenter} zoom={mapZoom} />
                          {customTileUrl && <CustomTileLayer url={customTileUrl} />}
                        </MapContainer>
                      )}
                    </div>
                  </div>

                  {/* Summary Cards */}
                  {result && (
                    <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-500">
                      <Card className="text-center hover:scale-105 transition-transform backdrop-blur-sm bg-white/80 dark:bg-black/30 border-purple-400/50">
                        <CardContent className="pt-6">
                          <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold mb-2">Analysis Type</p>
                          <Badge variant="secondary" className="text-base bg-purple-500/20">
                            {result.analysis_type}
                          </Badge>
                        </CardContent>
                      </Card>
                      
                      <Card className="text-center hover:scale-105 transition-transform backdrop-blur-sm bg-white/80 dark:bg-black/30 border-cyan-400/50">
                        <CardContent className="pt-6">
                          <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold mb-2">Summary Value</p>
                          <p className="text-lg font-bold text-cyan-400">
                            {result.summary_value}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="text-center hover:scale-105 transition-transform backdrop-blur-sm bg-white/80 dark:bg-black/30 border-pink-400/50">
                        <CardContent className="pt-6">
                          <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold mb-2">Date Range</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {result.date_range.start} to {result.date_range.end}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* LULC Color Legend */}
                  {result && result.analysis_type === 'LULC' && (
                    <Card className="animate-in fade-in duration-500 backdrop-blur-sm bg-white/80 dark:bg-black/30 border-green-400/50">
                      <CardHeader className="bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                        <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100 text-base">
                          <MapPin className="w-5 h-5 text-green-400" />
                          LULC Color Classes Legend
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                          {[
                            { color: '#006400', code: '10', label: 'Trees' },
                            { color: '#ffbb22', code: '20', label: 'Shrubland' },
                            { color: '#ffff4c', code: '30', label: 'Grassland' },
                            { color: '#f096ff', code: '40', label: 'Cropland' },
                            { color: '#fa0000', code: '50', label: 'Built-up' },
                            { color: '#b4b4b4', code: '60', label: 'Barren / sparse vegetation' },
                            { color: '#f0f0f0', code: '70', label: 'Snow and ice' },
                            { color: '#0064c8', code: '80', label: 'Open water' },
                            { color: '#0096a0', code: '90', label: 'Herbaceous wetland' },
                            { color: '#00cf75', code: '95', label: 'Mangroves' },
                            { color: '#fae6a0', code: '100', label: 'Moss and lichen' }
                          ].map((item) => (
                            <div key={item.code} className="flex items-center gap-2 text-sm">
                              <div 
                                className="w-5 h-5 rounded border border-gray-400 dark:border-gray-500 flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-mono text-xs text-muted-foreground w-8">{item.code}</span>
                              <span className="text-foreground text-xs">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Output Tabs */}
                  {result && (
                    <div className="animate-in fade-in duration-500 delay-200">
                      <Tabs value={outputTab} onValueChange={(v) => setOutputTab(v as 'map' | 'chart')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-black/40 backdrop-blur-sm">
                          <TabsTrigger 
                            value="map" 
                            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all duration-300"
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Static Map
                          </TabsTrigger>
                          <TabsTrigger 
                            value="chart"
                            className="data-[state=active]:bg-pink-600 data-[state=active]:text-white transition-all duration-300"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Time-Series Chart
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="map" className="mt-6">
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                              <ImageIcon className="w-5 h-5 text-purple-400" />
                              Static Map
                            </h3>
                            {/* 👉 THE FIX IS APPLIED HERE: Added h-[400px] md:h-[500px] object-cover object-center */}
                            <img
                              src={result.output_map.map_base64_jpg}
                              alt="Static Map"
                              className="w-full h-[400px] md:h-[500px] object-cover object-center rounded-lg border-2 border-purple-400/50 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300"
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="chart" className="mt-6">
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                              <BarChart3 className="w-5 h-5 text-pink-400" />
                              Time-Series Chart
                            </h3>
                            <img
                              src={result.output_chart.chart_base64_jpg || 'https://via.placeholder.com/512x512.png?text=No+Chart+Generated'}
                              alt="Time-Series Chart"
                              className="w-full rounded-lg border-2 border-pink-400/50 shadow-md shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/40 transition-all duration-300"
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <Card className="text-center shadow-lg animate-in fade-in duration-500 delay-300 backdrop-blur-sm bg-white/90 dark:bg-black/40 border-cyan-400/50">
            <CardContent className="py-6">
              <p className="font-semibold text-slate-700 dark:text-cyan-200">
                DEVELOPED BY KADA NIKHIL SATYA VARDHAN
              </p>
              <p className="text-sm text-slate-600 dark:text-cyan-300 mt-2">
                Contact: <a href="mailto:nikhilsatyavardhan@gmail.com" className="text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:underline font-semibold">nikhilsatyavardhan@gmail.com</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Ensure absolute elements don't block interaction */}
      <style dangerouslySetInnerHTML={{__html: `
        .pointer-events-none { pointer-events: none; }
      `}} />
    </div>
  )
}