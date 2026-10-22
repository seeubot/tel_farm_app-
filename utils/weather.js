// Free weather API using Open-Meteo (no API key required!)
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Free geocoding API
const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export async function getWeatherByCoords(latitude, longitude) {
  try {
    const url = `${WEATHER_API_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || !data.current) {
      throw new Error('No weather data received');
    }
    
    return {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
      timestamp: new Date().toLocaleTimeString(),
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

export async function getWeatherByLocation(locationName) {
  try {
    // First, get coordinates for the location
    const geoUrl = `${GEOCODING_API_URL}?name=${encodeURIComponent(locationName)}&count=1`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      return null;
    }
    
    const { latitude, longitude, name } = geoData.results[0];
    const weather = await getWeatherByCoords(latitude, longitude);
    
    return {
      ...weather,
      locationName: name,
    };
  } catch (error) {
    console.error('Location search error:', error);
    return null;
  }
}

// Weather code to condition mapping
export function getWeatherCondition(weatherCode) {
  // WMO Weather Interpretation Codes (https://open-meteo.com/en/docs)
  const conditions = {
    0: { main: 'Clear', description: 'Clear sky', icon: 'sunny', bgColor: '#FFD700', textColor: '#333' },
    1: { main: 'Mainly Clear', description: 'Mainly clear', icon: 'sunny', bgColor: '#FFD700', textColor: '#333' },
    2: { main: 'Partly Cloudy', description: 'Partly cloudy', icon: 'cloud-queue', bgColor: '#B0BEC5', textColor: '#333' },
    3: { main: 'Overcast', description: 'Overcast', icon: 'cloud', bgColor: '#90A4AE', textColor: '#FFF' },
    45: { main: 'Foggy', description: 'Fog', icon: 'foggy', bgColor: '#78909C', textColor: '#FFF' },
    48: { main: 'Foggy', description: 'Depositing rime fog', icon: 'foggy', bgColor: '#78909C', textColor: '#FFF' },
    51: { main: 'Drizzle', description: 'Light drizzle', icon: 'rainy', bgColor: '#546E7A', textColor: '#FFF' },
    53: { main: 'Drizzle', description: 'Moderate drizzle', icon: 'rainy', bgColor: '#455A64', textColor: '#FFF' },
    55: { main: 'Drizzle', description: 'Dense drizzle', icon: 'rainy', bgColor: '#37474F', textColor: '#FFF' },
    61: { main: 'Rain', description: 'Slight rain', icon: 'rainy', bgColor: '#546E7A', textColor: '#FFF' },
    63: { main: 'Rain', description: 'Moderate rain', icon: 'rainy', bgColor: '#455A64', textColor: '#FFF' },
    65: { main: 'Rain', description: 'Heavy rain', icon: 'rainy', bgColor: '#37474F', textColor: '#FFF' },
    71: { main: 'Snow', description: 'Slight snow', icon: 'ac-unit', bgColor: '#ECEFF1', textColor: '#333' },
    73: { main: 'Snow', description: 'Moderate snow', icon: 'ac-unit', bgColor: '#CFD8DC', textColor: '#333' },
    75: { main: 'Snow', description: 'Heavy snow', icon: 'ac-unit', bgColor: '#B0BEC5', textColor: '#333' },
    80: { main: 'Rain Showers', description: 'Slight rain showers', icon: 'rainy', bgColor: '#546E7A', textColor: '#FFF' },
    81: { main: 'Rain Showers', description: 'Moderate rain showers', icon: 'rainy', bgColor: '#455A64', textColor: '#FFF' },
    82: { main: 'Rain Showers', description: 'Violent rain showers', icon: 'rainy', bgColor: '#37474F', textColor: '#FFF' },
    95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: 'thunderstorm', bgColor: '#4A148C', textColor: '#FFF' },
  };
  
  return conditions[weatherCode] || conditions[0];
}