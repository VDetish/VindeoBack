// src/repos/feed.repo.js
import {
  getFeedCandidatesWithStats as dbGetCandidates,
  getUserCatMap as dbGetUserCatMap,          // возвращает строки [{category_id,w}]
  recordFeedEvent as dbRecordFeedEvent
} from "../../modules/mysql.js";

// кандидаты с базовыми статами
export function fetchCandidatesWithStats(params) {
  return dbGetCandidates(params);
}

// «аффинити» пользователя по категориям
export async function fetchUserCatRows(userId) {
  // вернём как строки; мапу соберём выше
  return dbGetUserCatMap(userId);
}

// запись события (и всё, что внутри неё ты уже делаешь: stats + affinity)
export function writeEvent({ userId, listingId, ev, dwellMs }) {
  console.log('writeEvent', { userId, listingId, ev, dwellMs });
  
  return dbRecordFeedEvent({ userId, listingId, ev, dwellMs });
}