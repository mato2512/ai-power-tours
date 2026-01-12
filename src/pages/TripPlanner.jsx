import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "@/api/apiClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sparkles,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  Loader2,
  Save,
  Clock,
  Navigation,
  Plane
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import TripItinerary from "@/components/trip/TripItinerary";
import CostBreakdown from "@/components/trip/CostBreakdown";
import TripRecommendations from "@/components/trip/TripRecommendations";
import RouteMap from "@/components/trip/RouteMap";

export default function TripPlannerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedTrip, setGeneratedTrip] = useState(null);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const [formData, setFormData] = useState({
    source: "",
    destination: location.state?.destination || "",
    startDate: location.state?.startDate || null,
    endDate: null,
    travelers: location.state?.travelers || 1,
    travelType: "family",
    interests: [],
    budget: 5000,
    budgetCategory: "moderate"
  });

  const interestsOptions = [
    "Adventure", "Relaxing", "Heritage", "Luxury", "Beach", 
    "Mountain", "Wildlife", "Food", "Photography", "Shopping"
  ];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await apiClient.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log("User not logged in");
      }
    };
    fetchUser();
  }, []);

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleGenerateTrip = async () => {
    if (!formData.source || !formData.destination || !formData.startDate || !formData.endDate) {
      alert("Please fill in all required fields");
      return;
    }

    if (!user) {
      apiClient.auth.redirectToLogin(window.location.pathname);
      return;
    }

    setLoading(true);

    try {
      const days = differenceInDays(formData.endDate, formData.startDate) + 1;

      const prompt = `You are a professional travel planner. Plan a comprehensive ${days}-day trip from ${formData.source} to ${formData.destination} for ${formData.travelers} travelers.

Budget: $${formData.budget} (${formData.budgetCategory} category)
Travel type: ${formData.travelType}
Interests: ${formData.interests.join(", ") || "General sightseeing"}

Create a COMPLETE day-by-day itinerary with ALL ${days} days included.

Requirements:
1. Include ALL ${days} days - no exceptions
2. Real cities/locations with accurate GPS coordinates
3. Specific morning, afternoon, and evening activities for each day
4. Hotel suggestions with realistic costs per night
5. Distance (km) and travel time between each location
6. Realistic cost breakdown within the $${formData.budget} budget
7. Practical packing list (at least 10 items)
8. Safety tips (at least 5 tips)
9. Local food recommendations (at least 5 dishes)
10. Hidden gems (at least 5 unique spots)

Return ONLY valid JSON (no markdown, no code blocks, no extra text). Use this EXACT structure:

{
  "trip_title": "Descriptive title",
  "trip_description": "2-3 sentence description",
  "total_distance": ${Math.round(days * 150)},
  "total_cost": ${formData.budget},
  "accommodation_cost": ${Math.round(formData.budget * 0.4)},
  "food_cost": ${Math.round(formData.budget * 0.3)},
  "transport_cost": ${Math.round(formData.budget * 0.15)},
  "activities_cost": ${Math.round(formData.budget * 0.15)},
  "daily_plans": [${Array.from({length: days}, (_, i) => `
    {
      "day": ${i + 1},
      "location": "City/Place name",
      "latitude": 0.0,
      "longitude": 0.0,
      "distance_km": ${i === 0 ? 0 : 100},
      "travel_time": "${i === 0 ? '0 hours' : '2-3 hours'}",
      "why_visit": "Reason to visit this location",
      "day_title": "Day ${i + 1} title",
      "morning": "Morning activity details",
      "afternoon": "Afternoon activity details",
      "evening": "Evening activity details",
      "hotel_suggestion": "Hotel name",
      "hotel_cost": ${Math.round(formData.budget * 0.4 / days)}
    }`).join(',')}
  ],
  "packing_list": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6", "Item 7", "Item 8", "Item 9", "Item 10"],
  "safety_tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5"],
  "food_recommendations": ["Food 1", "Food 2", "Food 3", "Food 4", "Food 5"],
  "hidden_gems": ["Gem 1", "Gem 2", "Gem 3", "Gem 4", "Gem 5"]
}`;

      const result = await apiClient.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: { type: 'json_object' }
      });

      console.log('AI Response:', result);

      // Check if there was an error
      if (result.error) {
        console.error('AI returned error:', result);
        alert('AI failed to generate proper trip data: ' + (result.error || JSON.stringify(result)));
        return;
      }

      // Check if result is empty or not an object
      if (!result || typeof result !== 'object') {
        console.error('Invalid AI response:', result);
        alert('AI returned invalid response format. Please try again.');
        return;
      }

      // Validate required fields
      if (!result.daily_plans || result.daily_plans.length === 0) {
        console.error('No daily plans in response:', result);
        alert('AI did not generate daily itinerary. Please try again with different parameters.');
        return;
      }

      // Transform to match expected format
      const transformed = {
        trip_summary: {
          title: result.trip_title,
          description: result.trip_description,
          duration_days: days,
          distance_km: result.total_distance || 0,
          travel_time: `${days} days`
        },
        daily_itinerary: result.daily_plans?.map(day => ({
          day: day.day,
          city_location: day.location,
          coordinates: { lat: day.latitude, lng: day.longitude },
          distance_from_previous: day.distance_km,
          travel_time: day.travel_time,
          why_visit: day.why_visit,
          title: day.day_title,
          activities: [
            { time: "Morning", activity: day.morning, location: day.location, description: "", estimated_cost: 0 },
            { time: "Afternoon", activity: day.afternoon, location: day.location, description: "", estimated_cost: 0 },
            { time: "Evening", activity: day.evening, location: day.location, description: "", estimated_cost: 0 }
          ],
          accommodation: {
            hotel_name: day.hotel_suggestion,
            area: day.location,
            estimated_cost: day.hotel_cost
          },
          meals: []
        })) || [],
        cost_breakdown: {
          total: result.total_cost || formData.budget,
          accommodation: { total: result.accommodation_cost || formData.budget * 0.4 },
          food: { total: result.food_cost || formData.budget * 0.3 },
          activities: result.activities_cost || formData.budget * 0.2,
          transportation: { total: result.transport_cost || formData.budget * 0.1 }
        },
        packing_list: result.packing_list || [],
        safety_tips: result.safety_tips || [],
        food_recommendations: result.food_recommendations || [],
        hidden_gems: result.hidden_gems || []
      };

      setGeneratedTrip(transformed);
    } catch (error) {
      console.error("Error generating trip:", error);
      alert("Failed to generate trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!generatedTrip) return;

    setSaving(true);
    try {
      // Transform daily itinerary to match Trip model schema
      const itinerary = generatedTrip.daily_itinerary?.map(day => ({
        day: day.day,
        date: new Date(formData.startDate.getTime() + (day.day - 1) * 24 * 60 * 60 * 1000),
        activities: day.activities?.map(act => ({
          time: act.time,
          title: act.activity || `${act.time} Activity`,
          description: act.description || act.activity || '',
          location: act.location || day.city_location,
          cost: act.estimated_cost || 0
        })) || []
      })) || [];

      await apiClient.entities.Trip.create({
        title: generatedTrip.trip_summary.title,
        destination: formData.destination,
        startDate: format(formData.startDate, "yyyy-MM-dd"),
        endDate: format(formData.endDate, "yyyy-MM-dd"),
        status: "planning",
        budget: {
          total: formData.budget,
          spent: 0
        },
        travelers: {
          adults: formData.travelers,
          children: 0
        },
        itinerary: itinerary,
        notes: generatedTrip.trip_summary.description
      });

      alert("Trip saved successfully!");
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Error saving trip:", error);
      alert("Failed to save trip: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 font-medium">AI-Powered Trip Planning</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Plan Your Perfect Journey
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let our AI create a personalized itinerary tailored to your preferences
          </p>
        </motion.div>

        {/* Trip Planning Form */}
        {!generatedTrip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="text-2xl">Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Source */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      Starting From *
                    </Label>
                    <Input
                      placeholder="Enter your city"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  {/* Destination */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Destination *
                    </Label>
                    <Input
                      placeholder="Where do you want to go?"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      Start Date *
                    </Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-12 justify-start">
                          {formData.startDate ? format(formData.startDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => {
                            setFormData({ ...formData, startDate: date });
                            setStartDateOpen(false);
                          }}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      End Date *
                    </Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-12 justify-start">
                          {formData.endDate ? format(formData.endDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => {
                            setFormData({ ...formData, endDate: date });
                            setEndDateOpen(false);
                          }}
                          disabled={(date) => !formData.startDate || date < formData.startDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Travelers */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Number of Travelers
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.travelers}
                      onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })}
                      className="h-12"
                    />
                  </div>

                  {/* Travel Type */}
                  <div className="space-y-2">
                    <Label>Travel Type</Label>
                    <Select value={formData.travelType} onValueChange={(value) => setFormData({ ...formData, travelType: value })}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Solo</SelectItem>
                        <SelectItem value="couple">Couple</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="friends">Friends</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      Budget (USD)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                      className="h-12"
                    />
                  </div>

                  {/* Budget Category */}
                  <div className="space-y-2">
                    <Label>Budget Category</Label>
                    <Select value={formData.budgetCategory} onValueChange={(value) => setFormData({ ...formData, budgetCategory: value })}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                        <SelectItem value="ultra_luxury">Ultra Luxury</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Interests */}
                <div className="mt-6 space-y-2">
                  <Label>Travel Interests</Label>
                  <div className="flex flex-wrap gap-2">
                    {interestsOptions.map((interest) => (
                      <Badge
                        key={interest}
                        variant={formData.interests.includes(interest) ? "default" : "outline"}
                        className={`cursor-pointer px-4 py-2 ${
                          formData.interests.includes(interest)
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "hover:bg-blue-50"
                        }`}
                        onClick={() => handleInterestToggle(interest)}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerateTrip}
                  disabled={loading}
                  className="w-full mt-8 h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Your Perfect Trip...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate AI Trip Plan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Generated Trip Results */}
        {generatedTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Trip Header */}
            <Card className="shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{generatedTrip.trip_summary.title}</h2>
                    <p className="text-blue-100 text-lg">{generatedTrip.trip_summary.description}</p>
                  </div>
                  <Button
                    onClick={handleSaveTrip}
                    disabled={saving}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Trip
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                    <Clock className="w-5 h-5 mb-2" />
                    <div className="text-sm text-blue-100">Duration</div>
                    <div className="text-lg font-bold">{generatedTrip.trip_summary.duration_days} Days</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                    <Navigation className="w-5 h-5 mb-2" />
                    <div className="text-sm text-blue-100">Distance</div>
                    <div className="text-lg font-bold">{generatedTrip.trip_summary.distance_km} km</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                    <Plane className="w-5 h-5 mb-2" />
                    <div className="text-sm text-blue-100">Travel Time</div>
                    <div className="text-lg font-bold">{generatedTrip.trip_summary.travel_time}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                    <DollarSign className="w-5 h-5 mb-2" />
                    <div className="text-sm text-blue-100">Est. Cost</div>
                    <div className="text-lg font-bold">${generatedTrip.cost_breakdown.total.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Tabs defaultValue="route" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-14">
                <TabsTrigger value="route" className="text-base">Route Map</TabsTrigger>
                <TabsTrigger value="itinerary" className="text-base">Day-wise Plan</TabsTrigger>
                <TabsTrigger value="costs" className="text-base">Costs</TabsTrigger>
                <TabsTrigger value="recommendations" className="text-base">Tips</TabsTrigger>
              </TabsList>

              <TabsContent value="route">
                <RouteMap itinerary={generatedTrip.daily_itinerary} />
              </TabsContent>

              <TabsContent value="itinerary">
                <TripItinerary data={generatedTrip} />
              </TabsContent>

              <TabsContent value="costs">
                <CostBreakdown data={generatedTrip.cost_breakdown} />
              </TabsContent>

              <TabsContent value="recommendations">
                <TripRecommendations data={generatedTrip} />
              </TabsContent>
            </Tabs>

            <Button
              onClick={() => setGeneratedTrip(null)}
              variant="outline"
              className="w-full h-12"
            >
              Create Another Trip
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}