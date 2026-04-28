import { createContext, useContext, useState, type ReactNode } from "react";

export interface NeighborhoodCoords { lat: number; lng: number }

// Cities available in the Yelp dataset
export const CITY_CENTERS: Record<string, NeighborhoodCoords & { label: string }> = {
  "Philadelphia": { lat: 39.9526, lng: -75.1652, label: "Philadelphia, PA" },
  "Tucson":       { lat: 32.2226, lng: -110.9747, label: "Tucson, AZ" },
  "Tampa":        { lat: 27.9506, lng: -82.4572,  label: "Tampa, FL" },
  "Indianapolis": { lat: 39.7684, lng: -86.1581,  label: "Indianapolis, IN" },
  "Nashville":    { lat: 36.1627, lng: -86.7816,  label: "Nashville, TN" },
  "New Orleans":  { lat: 29.9511, lng: -90.0715,  label: "New Orleans, LA" },
  "Reno":         { lat: 39.5296, lng: -119.8138, label: "Reno, NV" },
  "Edmonton":     { lat: 53.5461, lng: -113.4938, label: "Edmonton, AB" },
  "Saint Louis":  { lat: 38.6270, lng: -90.1994,  label: "Saint Louis, MO" },
  "Santa Barbara":{ lat: 34.4208, lng: -119.6982, label: "Santa Barbara, CA" },
};

export const CITY_NEIGHBORHOODS: Record<string, Record<string, NeighborhoodCoords>> = {
  "Philadelphia": {
    "Center City":        { lat: 39.9526, lng: -75.1652 },
    "Rittenhouse":        { lat: 39.9493, lng: -75.1730 },
    "Old City":           { lat: 39.9496, lng: -75.1467 },
    "Fishtown":           { lat: 39.9726, lng: -75.1250 },
    "South Philly":       { lat: 39.9200, lng: -75.1590 },
    "Northern Liberties": { lat: 39.9640, lng: -75.1430 },
    "Fairmount":          { lat: 39.9660, lng: -75.1780 },
    "Bella Vista":        { lat: 39.9348, lng: -75.1568 },
    "Manayunk":           { lat: 40.0260, lng: -75.2260 },
    "University City":    { lat: 39.9522, lng: -75.1932 },
  },
  "Nashville": {
    "Downtown":      { lat: 36.1627, lng: -86.7816 },
    "The Gulch":     { lat: 36.1509, lng: -86.7922 },
    "East Nashville":{ lat: 36.1774, lng: -86.7521 },
    "Germantown":    { lat: 36.1844, lng: -86.7878 },
    "Midtown":       { lat: 36.1503, lng: -86.7968 },
    "Green Hills":   { lat: 36.1098, lng: -86.8120 },
    "Belle Meade":   { lat: 36.1165, lng: -86.8588 },
    "Nations":       { lat: 36.1631, lng: -86.8412 },
    "Berry Hill":    { lat: 36.1214, lng: -86.7724 },
    "Bellevue":      { lat: 36.0722, lng: -86.9028 },
  },
  "Tampa": {
    "Downtown Tampa":    { lat: 27.9506, lng: -82.4572 },
    "Hyde Park":         { lat: 27.9297, lng: -82.4729 },
    "Ybor City":         { lat: 27.9606, lng: -82.4372 },
    "Westshore":         { lat: 27.9518, lng: -82.5270 },
    "South Tampa":       { lat: 27.9079, lng: -82.4931 },
    "Seminole Heights":  { lat: 27.9977, lng: -82.4614 },
    "Carrollwood":       { lat: 28.0484, lng: -82.5096 },
  },
  "New Orleans": {
    "French Quarter":       { lat: 29.9584, lng: -90.0644 },
    "Garden District":      { lat: 29.9270, lng: -90.0902 },
    "Bywater":              { lat: 29.9531, lng: -90.0430 },
    "Mid-City":             { lat: 29.9792, lng: -90.0831 },
    "Uptown":               { lat: 29.9264, lng: -90.1130 },
    "Warehouse District":   { lat: 29.9446, lng: -90.0699 },
    "Marigny":              { lat: 29.9592, lng: -90.0554 },
  },
  "Indianapolis": {
    "Downtown Indy":    { lat: 39.7684, lng: -86.1581 },
    "Broad Ripple":     { lat: 39.8695, lng: -86.1405 },
    "Fountain Square":  { lat: 39.7476, lng: -86.1313 },
    "Near East Side":   { lat: 39.7719, lng: -86.1156 },
    "Irvington":        { lat: 39.7693, lng: -86.0688 },
    "Garfield Park":    { lat: 39.7280, lng: -86.1374 },
  },
  "Saint Louis": {
    "Downtown":         { lat: 38.6270, lng: -90.1994 },
    "Soulard":          { lat: 38.6012, lng: -90.2082 },
    "Central West End": { lat: 38.6432, lng: -90.2607 },
    "Forest Park":      { lat: 38.6378, lng: -90.2853 },
    "Midtown":          { lat: 38.6317, lng: -90.2327 },
    "Tower Grove":      { lat: 38.6085, lng: -90.2468 },
    "Maplewood":        { lat: 38.6091, lng: -90.3253 },
  },
  "Reno": {
    "Downtown Reno": { lat: 39.5296, lng: -119.8138 },
    "Midtown Reno":  { lat: 39.5145, lng: -119.8138 },
    "South Reno":    { lat: 39.4792, lng: -119.7937 },
    "West Reno":     { lat: 39.5422, lng: -119.8651 },
    "North Valleys": { lat: 39.6243, lng: -119.8365 },
  },
};

// Flat map kept for backward compat (Philly neighborhoods)
export const NEIGHBORHOODS = CITY_NEIGHBORHOODS["Philadelphia"];

const CITY_KEY  = "lantern_city";
const HOOD_KEY  = "lantern_neighborhood";

interface LocationContextValue {
  city:            string;
  setCity:         (c: string) => void;
  neighborhood:    string;
  setNeighborhood: (n: string) => void;
  coords:          NeighborhoodCoords;
  hasChosen:       boolean;
  showPicker:      boolean;
  openPicker:      () => void;
  closePicker:     () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function NeighborhoodProvider({ children }: { children: ReactNode }) {
  const storedCity = localStorage.getItem(CITY_KEY) ?? "";
  const storedHood = localStorage.getItem(HOOD_KEY) ?? "";
  const validCity  = storedCity && CITY_CENTERS[storedCity]  ? storedCity  : "";
  const validHood  = storedHood && validCity && CITY_NEIGHBORHOODS[validCity]?.[storedHood] ? storedHood : "";

  const [city,         _setCity]  = useState(validCity);
  const [neighborhood, _setHood]  = useState(validHood);
  const [showPicker,   setPicker] = useState(!validCity);

  function setCity(c: string) {
    _setCity(c);
    localStorage.setItem(CITY_KEY, c);
    // Clear neighborhood when city changes (neighborhoods are Philly-only)
    if (c !== "Philadelphia") {
      _setHood("");
      localStorage.removeItem(HOOD_KEY);
    }
  }
  function setNeighborhood(n: string) {
    _setHood(n);
    localStorage.setItem(HOOD_KEY, n);
  }

  const cityCoords  = city && CITY_CENTERS[city]
    ? CITY_CENTERS[city]
    : CITY_CENTERS["Philadelphia"];
  const hoodCoords  = neighborhood && city && CITY_NEIGHBORHOODS[city]?.[neighborhood]
    ? CITY_NEIGHBORHOODS[city][neighborhood]
    : null;
  const coords = hoodCoords ?? cityCoords;

  return (
    <LocationContext.Provider value={{
      city, setCity,
      neighborhood, setNeighborhood,
      coords,
      hasChosen:   !!city,
      showPicker,
      openPicker:  () => setPicker(true),
      closePicker: () => setPicker(false),
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useNeighborhood() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useNeighborhood must be inside NeighborhoodProvider");
  return ctx;
}
