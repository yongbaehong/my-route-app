import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Define translations
const resources = {
  en: {
    translation: {
      optimize: "Optimize Route",
      addStop: "Add Stop",
      complete: "Complete",
      priority: "Priority",
      delete: "Delete",
      nickname: "Nickname",
      address: "Address",
      enterAddress: "Enter Address",
      search: "Search",
      saveStop: "Save Stop",
      found: "Found",
      error: "Error",
      enterAddressPrompt: "Please enter an address",
      noResults: "No results found for this address",
      searchFailed: "Search failed, please try again",
      searchFirst: "Please search for an address first",
      enterNickname: "Please enter a nickname",
      // Add more as needed
    },
  },
  ko: {
    translation: {
      optimize: "경로 최적화",
      addStop: "정류장 추가",
      complete: "완료",
      priority: "우선순위",
      delete: "삭제",
      nickname: "별명",
      address: "주소",
      enterAddress: "주소 입력",
      search: "검색",
      saveStop: "정류장 저장",
      found: "찾음",
      error: "오류",
      enterAddressPrompt: "주소를 입력하세요",
      noResults: "이 주소에 대한 결과를 찾을 수 없습니다",
      searchFailed: "검색 실패, 다시 시도하세요",
      searchFirst: "먼저 주소를 검색하세요",
      enterNickname: "별명을 입력하세요",
      // Add more as needed
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
