import mysql from "mysql2/promise.js";
import htmlEntl from "html-entities";

// const connection = await mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: 'tool46',
//   // database: 'Vindeo',
// })

const connection = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function createSession(fields) {
  const query = await connection.query(
    "INSERT INTO Vindeo.sessions SET ?",
    fields
  );

  return !!query[1];
}

export async function getSession(value) {
  const query = await connection.query(
    "SELECT * FROM Vindeo.sessions WHERE ?",
    {
      value,
    }
  );

  const update = new Date();

  await connection.query("UPDATE Vindeo.sessions SET ? WHERE ?", [
    { update },
    { value },
  ]);

  // await connection.query('UPDATE Vindeo.sessions SET ? AND ? WHERE ?', [
  //   { ip },
  //   { update: new Date() },
  //   { value },
  // ])

  return query[0].length > 0;
}

export async function addDevice(session, json) {
  const fields = {
    device: json.device,
    platform: json.platform,
    platform_version: json.platformVersion,
    app_version: json.appVersion,
    session,
  };

  const fieldsUpdate = {
    platform_version: json.platformVersion,
    app_version: json.appVersion,
  };

  try {
    const query = await connection.query(
      "INSERT INTO `Vindeo`.`devices` SET ? ON DUPLICATE KEY UPDATE ?",
      [fields, fieldsUpdate]
    );

    return [!!query[1], session];
  } catch (e) {
    return [true, session];
  }
}

export async function addCall(fields) {
  const fieldsUpdate = { ...fields, fails: 0, validated: 0 };

  const query = await connection.query(
    "INSERT INTO `Vindeo`.`calls` SET ? ON DUPLICATE KEY UPDATE ?",
    [fields, fieldsUpdate]
  );

  return { status: !query[1] };
}

export async function checkCode({ phone, session, code }) {
  const [res, err] = await connection.query(
    "UPDATE `Vindeo`.calls SET validated = ? WHERE ? AND ? AND ? AND ? AND fails < 3",
    [1, { phone }, { code }, { session }, { validated: false }]
  );

  if (err) {
    return { valid: false, isNewUser: false };
  } else if (res.changedRows === 1) {
    const user = await getUserByPhone(phone);

    // Либо вход, либо регистрация
    if (!user) {
      const user = await createUser(phone);
      await updateSession(session, user.id);

      return { valid: true, isNewUser: true, user: null };
    } else {
      await updateSession(session, user.id);

      return { valid: true, isNewUser: false, user };
    }
  } else {
    await connection.query(
      "UPDATE `Vindeo`.calls SET fails = fails + 1 WHERE ? AND ? AND ?",
      [{ phone }, { session }, { validated: false }]
    );

    return { valid: false, isNewUser: false };
  }
}

export async function createUser(phone) {
  const [{ insertId }, err] = await connection.query(
    "INSERT INTO `Vindeo`.`users` SET ?",
    {
      phone,
    }
  );

  const user = await getUser(insertId);

  return user;
}

export async function getUser(id) {
  const [res, err] = await connection.query(
    "SELECT usr.*, ph.path as photo FROM `Vindeo`.`users` AS usr LEFT JOIN Vindeo.photos AS ph ON ph.user = usr.id WHERE ? ORDER BY ph.sort LIMIT 1",
    {
      "usr.id": id,
    }
  );

  return res[0];
}

export async function getUserFromSession(session) {
  const { user } = await getSessionUser(session);

  if (user) {
    const userData = await getUser(user);

    await updateSession(session, userData.id);

    return userData;
  } else {
    return null;
  }
}

export async function getUserByPhone(phone) {
  const [res, err] = await connection.query(
    "SELECT * FROM `Vindeo`.`users` WHERE ?",
    {
      phone,
    }
  );

  return res[0];
}

export async function updateSession(value, user) {
  const [, err] = await connection.query(
    "UPDATE Vindeo.sessions SET user = ? WHERE ?",
    [user, { value }]
  );

  const setUserToken = mysql.format(
    "UPDATE Vindeo.user_tokens SET user = ? WHERE ?",
    [user, { session: value }]
  );

  await connection.query(setUserToken);

  if (err) {
    console.log(err);
  }

  return !err;
}

export async function removeUser(session) {
  const userData = await getSessionUser(session);

  await connection.query(
    mysql.format("DELETE FROM `Vindeo`.users WHERE ?", [{ id: userData.user }])
  );
  await connection.query("UPDATE `Vindeo`.sessions SET user = 0 WHERE ?", [
    { value: session },
  ]);

  return true;
}

export async function getSessionUser(session) {
  const query = await connection.query(
    "SELECT * FROM `Vindeo`.`sessions` WHERE ?",
    {
      value: session,
    }
  );

  return query[0][0];
}

export async function setUserInfo({ name, family_name, sex }, session) {
  const userData = await getSessionUser(session);

  await connection.query(
    "UPDATE `Vindeo`.users SET name = ?, family_name = ?, sex = ? WHERE ?",
    [name, family_name, sex, { id: userData.user }]
  );

  return true;
}

export async function setUserEmail({ email }, session) {
  const userData = await getSessionUser(session);

  await connection.query("UPDATE `Vindeo`.users SET email = ? WHERE ?", [
    email,
    { id: userData.user },
  ]);

  return true;
}

export async function setUserOrientation({ orientation }, session) {
  const userData = await getSessionUser(session);

  await connection.query("UPDATE `Vindeo`.users SET orientation = ? WHERE ?", [
    orientation,
    { id: userData.user },
  ]);

  return true;
}

export async function setAge({ birth_date }, session) {
  const userData = await getSessionUser(session);

  await connection.query("UPDATE `Vindeo`.users SET birth_date = ? WHERE ?", [
    birth_date,
    { id: userData.user },
  ]);

  return true;
}

export async function addPhoto(fields, session) {
  const userData = await getSessionUser(session);
  fields.user = userData.user;
  const query = await connection.query(
    "INSERT INTO `Vindeo`.`photos` SET ?",
    fields
  );

  return query;
}

export async function getPhotos(session) {
  const { user } = await getSessionUser(session);

  const query = await connection.query(
    "SELECT * FROM `Vindeo`.`photos` WHERE ? ORDER BY sort",
    {
      user,
    }
  );

  return query[0];
}

export async function deletePhoto({ id }, session) {
  const { user } = await getSessionUser(session);

  const query = await connection.query(
    "DELETE FROM `Vindeo`.photos WHERE ? AND ?",
    [{ user }, { id }]
  );

  return !!query[1];
}

export async function getArtists(session) {
  const { user } = await getSessionUser(session);

  const query = await connection.query(
    `SELECT art.artist AS id, rate, name, path FROM Vindeo.users_artists AS art
      LEFT JOIN WierdConnections.artists_photos AS ph ON ph.artist = art.artist
      LEFT JOIN WierdConnections.artists AS a1 ON art.artist = a1.id
      WHERE ? ORDER BY rate DESC`,
    {
      user,
    }
  );

  return query[0];
}

export async function addInterest(fields, session) {
  const userData = await getSessionUser(session);

  fields.user = userData.user;

  try {
    const query = await connection.query(
      "INSERT INTO `Vindeo`.`users_interests` SET ?",
      fields
    );

    return !query[1];
  } catch (e) {
    return false;
  }
}

export async function addCover({ artist, artistId, path }) {
  let artists = null;

  if (!artistId) {
    artists = await getArtist(artist);
  } else {
    artists = [{ id: artistId }];
  }

  const query = await connection.query(
    "INSERT INTO WierdConnections.artists_photos SET ?",
    {
      artist: artists[0].id,
      path,
    }
  );

  return query;
}

export async function getArtist(artist) {
  const artistName = formatName(artist);
  const addArtists = [[artist, artist.toUpperCase()]];
  await addArtistsToDb(addArtists);

  const query = await connection.query(
    "SELECT * FROM WierdConnections.`artists` WHERE ? OR ?",
    [
      {
        f_name: artist,
      },
      {
        f_name: artistName,
      },
    ]
  );

  return query[0];
}

export async function getCover(artist, artistId) {
  let artists = null;

  if (!artistId) {
    artists = await getArtist(artist);
  } else {
    artists = [{ id: artistId }];
  }

  const query = await connection.query(
    "SELECT * FROM WierdConnections.`artists_photos` WHERE ?",
    {
      artist: artists[0].id,
    }
  );

  return query[0];
}

export async function getCovers(list) {
  const artists = list.map(({ id }) => id);

  const query = await connection.query(
    "SELECT * FROM WierdConnections.artists_photos WHERE artist IN (?)",
    [artists]
  );

  return query[0];
}

export async function artistsNoCover() {
  const query = await connection.query(
    "SELECT name FROM WierdConnections.artists WHERE id NOT IN (SELECT artist FROM WierdConnections.artists_photos) LIMIT 20"
  );

  return query[0];
}

export async function addArtistRecomend(fields, session) {
  const userData = await getSessionUser(session);
  fields.user = userData.user;

  const artists = await getArtist(fields.artist);

  fields.artist = artists[0].id;

  const query = await connection.query(
    "INSERT INTO `Vindeo`.`users_artists_recommend` SET ? ON DUPLICATE KEY UPDATE rate = rate + 1",
    fields
  );

  return { status: !query[1] };
}

async function selectArtists(artists) {
  const query = await connection.query(
    "SELECT id, name, f_name FROM WierdConnections.artists WHERE f_name IN (?)",
    [artists]
  );

  return query[0];
}

async function addArtistsToDb(artists) {
  const query = await connection.query(
    "insert ignore into WierdConnections.artists (name, f_name) values ?",
    [artists]
  );

  return query;
}

export async function addArtists(artists, session) {
  artists = artists.filter((item) => item.artist !== undefined);
  const addArtists = artists.map((item) => [
    item?.artist,
    item?.artist.toUpperCase(),
  ]);
  await addArtistsToDb(addArtists);

  const userData = await getSessionUser(session);
  const artistsWithID = await selectArtists(
    artists.map(({ artist }) => formatName(artist))
  );

  const a3 = artists.map((t1) => ({
    ...t1,
    ...artistsWithID.find(
      (t2) => t2.f_name === formatName(t1.artist.toUpperCase())
    ),
  }));

  const a4 = a3
    .filter(({ id }) => !!id)
    .map(({ id, count }) => [userData.user, id, count]);

  const query = await connection.query(
    `INSERT INTO Vindeo.users_artists (user, artist, rate) VALUES ?
    ON DUPLICATE KEY UPDATE rate=VALUES(rate)`,
    [a4]
  );

  await connection.query(
    "INSERT INTO Vindeo.cw_queue SET ? ON DUPLICATE KEY UPDATE ready = 0",
    [{ user: userData.user, ready: 0 }]
  );

  return { status: !query[1], data: a3 };
}

export async function addArtist(fields, session) {
  const userData = await getSessionUser(session);
  fields.user = userData.user;

  const query = await connection.query(
    "INSERT INTO `Vindeo`.`users_artists` SET ? ON DUPLICATE KEY UPDATE rate = rate + 1",
    fields
  );

  try {
    await connection.query(
      mysql.format(
        "DELETE FROM `Vindeo`.users_artists_recommend WHERE ? AND ?",
        [{ user: userData.user }, { artist: fields.artist }]
      )
    );
  } catch (e) {
    console.log(e);
  }

  await connection.query(
    "INSERT INTO Vindeo.cw_queue SET ? ON DUPLICATE KEY UPDATE ready = 0",
    [{ user: userData.user, ready: 0 }]
  );

  return { status: !query[1] };
}

export async function getArtistsRecommend(session) {
  const { user } = await getSessionUser(session);

  const query = await connection.query(
    "SELECT art.id, name, path FROM Vindeo.users_artists_recommend AS art_rec JOIN WierdConnections.artists AS art ON art_rec.artist = art.id LEFT JOIN WierdConnections.artists_photos AS ph ON ph.artist = art_rec.artist WHERE ? GROUP BY art.id ORDER BY art_rec.rate DESC LIMIT 18",
    { "art_rec.user": user }
  );

  return query[0];
}

export async function getUsersRecomendations(session) {
  const { user } = await getSessionUser(session);
  await getSearchSettings(user);

  const query = await connection.query(
    `SELECT us.*, usr.userTo, usr.id AS rec_id, cities.name as cityName FROM Vindeo.cw_recommend_users AS usr
      JOIN Vindeo.users AS us ON us.id = usr.userTo
      JOIN Vindeo.user_settings AS settings ON settings.user = usr.user
      LEFT JOIN Vindeo.geo_cities AS cities ON cities.id = usr.city
      WHERE ? AND ? AND CASE WHEN settings.sex = 0 THEN usr.sex = 2 OR usr.sex = 1 ELSE usr.sex = settings.sex END LIMIT 5`,
    [{ "usr.user": user ? user : 1 }, { isLiked: 0 }]
  );

  // No users to recommend
  if (query[0].length === 0) {
    const users = await getUsers(user);
    const rcUsers = [];

    users.forEach((e) => {
      rcUsers.push([user, e.id, 1, e.sex, e.location]);
    });

    rcUsers.length > 0 && (await addUsers(rcUsers));
  }

  return query[0];
}

// Поиск пользователей
export async function getUsers(user) {
  const query = await connection.query(
    `SELECT *
  FROM Vindeo.users
  WHERE id != ? AND id NOT IN
      (SELECT userTo AS id
       FROM Vindeo.cw_recommend_users WHERE ?) LIMIT 5`,
    [user, { user }]
  );

  return query[0];
}

export async function addUsers(users) {
  const query = await connection.query(
    "INSERT IGNORE INTO Vindeo.cw_recommend_users (user, userTo, quality, sex, city) values ?",
    [users]
  );

  return query[0];
}
//

// Настройки поиска
export async function getSearchSettings(user) {
  let [res, err] = await connection.query(
    "SELECT * FROM Vindeo.user_settings WHERE ?",
    [{ user }]
  );

  if (res.length === 0) {
    await saveSearchSettingsShort(
      { sex: 0, city: 1, age_from: 18, age_to: 35 },
      user
    );
  }

  return false;
}

export async function getCity(id) {
  let [res, err] = await connection.query(
    "SELECT * FROM Vindeo.geo_cities WHERE ?",
    [{ id }]
  );

  return res[0];
}

export async function addCity(fields) {
  const query = await connection.query(
    "INSERT INTO Vindeo.geo_cities SET ?",
    fields
  );

  return { status: !!query[0] };
}

export async function saveSearchSettingsShort(fields, user) {
  fields.user = user;

  const query = await connection.query(
    "INSERT INTO Vindeo.user_settings SET ? ON DUPLICATE KEY UPDATE ?",
    [fields, fields]
  );
  return { status: !!query[0] };
}

export async function saveSearchSettings(fields, session) {
  const { user } = await getSessionUser(session);
  fields.user = user;

  const query = await connection.query(
    "INSERT INTO Vindeo.user_settings SET ? ON DUPLICATE KEY UPDATE ?",
    [fields, fields]
  );
  return { status: !!query[0] };
}

export async function getMutualArtists(m_user, session) {
  const { user } = await getSessionUser(session);

  const to_bd = mysql.format(
    `SELECT a.name, ph.path FROM WierdConnections.user_artists AS u_a
      JOIN Vindeo.users_artists AS my_u_a ON my_u_a.artist = u_a.artist
      JOIN WierdConnections.artists_photos AS ph ON ph.artist = u_a.artist
      JOIN WierdConnections.artists AS a ON a.id = my_u_a.artist
    WHERE ? AND my_u_a.user = 1 ORDER BY my_u_a.rate DESC LIMIT 25`,
    [{ "u_a.user": m_user }, { "my_u_a.user": user }]
  );

  const [my_fav] = await connection.query(to_bd);
  const [user_fav] = await connection.query(
    to_bd.replace("my_u_a.rate", "u_a.count")
  );

  return [...my_fav, ...user_fav].filter(
    (v, i, a) => a.findIndex((t) => t.name === v.name) === i
  );
}

export async function setUsersReaction({ reaction, id }, session) {
  const { user } = await getSessionUser(session);

  const [res, err] = await connection.query(
    "UPDATE Vindeo.cw_recommend_users SET ? WHERE ? AND ?",
    [{ isLiked: reaction }, { id }, { user }]
  );

  return res.changedRows === 1;
}

export async function getUserPhotos(user, session) {
  const query = await connection.query(
    "SELECT * FROM Vindeo.photos WHERE ? ORDER BY sort",
    [{ user }]
  );

  return query[0];
}

// Фото из инсты от других пользователей
export async function getInstagramPhotos(user) {
  const [res] = await connection.query(
    "SELECT url FROM Vindeo.user_instagram WHERE ?",
    [{ user }]
  );

  return res;
}

export async function addInstagramPhotos({ photos, user }) {
  const list = photos.map((el) => [user, el]);

  const to_bd = mysql.format(
    "INSERT INTO Vindeo.user_instagram (user, url) VALUES ? ON DUPLICATE KEY UPDATE times = times + 1",
    [list]
  );

  const query = await connection.query(to_bd);

  return { status: !query[1] };
}

export async function sortPhotos(photos, session) {
  const { user } = await getSessionUser(session);
  const list = photos.map((photo) => [user, photo[0], photo[1]]);
  const sort = photos.map((photo) => photo[1]);

  const to_bd = mysql.format(
    "INSERT INTO Vindeo.photos (user, id, sort) VALUES ? ON DUPLICATE KEY UPDATE sort=VALUES(sort)",
    [list, sort]
  );

  const query = await connection.query(to_bd);

  return { status: !query[1] };
}

//
// Мессенджер
//

export async function getUserChats(session) {
  const { user } = await getSessionUser(session);

  const [chatList] = await connection.query(
    `SELECT c.id, c.name, c.type, c.user, c.color FROM Vindeo.chat_users AS cu JOIN Vindeo.chats AS c ON cu.chat = c.id WHERE ? AND ?`,
    [{ "cu.user": user }, { "c.type": 2 }]
  );

  const users = await userToUserChat(user);

  return [...users, ...chatList];
}

export async function userToUserChat(user) {
  const [chatList] = await connection.query(
    `SELECT c.id, CONCAT(u.name, ' ', u.family_name) AS name, c.type, cuu.user, c.color FROM Vindeo.chat_users AS cu
    JOIN Vindeo.chats AS c ON cu.chat = c.id
    JOIN Vindeo.chat_users AS cuu ON cuu.chat = cu.chat
    JOIN Vindeo.users AS u ON cuu.user = u.id
    WHERE ? AND ? AND cuu.user != cu.user`,
    [{ "cu.user": user }, { "c.type": 1 }]
  );

  return chatList;
}

export async function getContactList(session) {
  const { user } = await getSessionUser(session);

  const query_format = mysql.format(
    `SELECT 
      cu.id AS user,
      CONCAT(cu.name, ' ', cu.family_name) AS name, 
      p.path AS path, 
      s.update AS last_seen 
      FROM 
          Vindeo.users AS cu
      LEFT JOIN 
          Vindeo.sessions AS s ON cu.id = s.user
      LEFT JOIN 
          Vindeo.photos AS p ON p.user = cu.id AND p.sort = 0
      WHERE cu.id != ?`,
    [user]
  );

  const [contactList] = await connection.query(query_format);

  return contactList;
}

export async function getMessage(id) {
  const query = await connection.query(
    "SELECT * FROM Vindeo.chat_messages WHERE ?",
    { id }
  );

  return query[0];
}

// Получаем последние 100 непрочитанных сообщений
export async function getChatMessages(chat, session) {
  const { user } = await getSessionUser(session);
  const [res] = await userChatAccess({ user, chat });

  if (res?.access === 0 || res?.access === 1 || res?.access === 2) {
    const query_format = mysql.format(
      `SELECT * FROM Vindeo.chat_messages WHERE ? AND id > ? ORDER BY time DESC LIMIT 1000`,
      [{ chat }, res.last_message]
    );

    const [res_] = await connection.query(query_format);

    return res_;
  }
}

// 0 — читать, писать
// 1 — читать
// 2 — админ
export async function userChatAccess({ user, chat }) {
  const query_format = mysql.format(
    `SELECT access, last_message FROM Vindeo.chat_users WHERE ? AND ?`,
    [{ user }, { chat }]
  );

  const [res] = await connection.query(query_format);

  return res;
}

export async function addMessage({ chat, hash, text }, session) {
  const { user } = await getSessionUser(session);
  const msg = { chat, hash, text, user };

  const [res] = await connection.query(
    `INSERT INTO Vindeo.chat_messages SET ?`,
    msg
  );

  const message = await getMessage(res.insertId);

  return message[0];
}

export async function addPushToken(token, session) {
  const { user } = await getSessionUser(session);

  try {
    const [res, err] = await connection.query(
      `INSERT INTO Vindeo.user_tokens SET ?`,
      {
        user,
        token,
        session,
      }
    );

    return !!err;
  } catch (e) {
    return false;
  }
}

// Проверять ещё на offline
export async function chatPushTokens({ chat, user }) {
  const [res] = await connection.query(
    `SELECT ut.token FROM Vindeo.chat_users AS ch JOIN Vindeo.user_tokens AS ut ON ch.user = ut.user WHERE ? AND ch.user != ?`,
    [{ chat }, user]
  );

  return res.map((e) => e.token);
}

export async function getChatTitle(id) {
  const [res] = await connection.query(
    `SELECT name FROM Vindeo.chats WHERE ?`,
    [{ id }]
  );

  return res[0].name;
}

export async function createChat({ users, title }, session) {
  const userData = await getSessionUser(session);

  if (users?.length > 0) {
    const chat = {
      user: userData?.user,
      type: users?.length === 1 ? 1 : 2,
      color: 69,
      name: title || null,
    };

    const [res] = await connection.query(
      `INSERT INTO Vindeo.chats SET ?`,
      chat
    );

    const mainUser = [
      res?.insertId,
      userData?.user,
      users?.length === 1 ? 1 : 2,
    ];

    const addedUsers = users?.map((user) => [
      res?.insertId,
      user,
      users?.length === 1 ? 1 : 2,
    ]);

    const chats = [mainUser, ...addedUsers];

    await connection.query(
      `INSERT INTO Vindeo.chat_users (chat, user, type) VALUES ?`,
      [chats]
    );

    return { chatId: res.insertId };
  }
}

//
// Мессенджер
//

// Рекомендации
// --- Рекомендации: лог событий, аффинити, кандидаты ---

/** Записать событие фида и, если нужно, подправить аффинити */
export async function recordFeedEvent({ userId, listingId, ev, dwellMs }) {
  // 1) пишем событие
  await connection.query(
    "INSERT INTO Vindeo.feed_events SET ?",
    { user_id: userId, listing_id: listingId, ev, dwell_ms: dwellMs ?? null }
  );

  // 2) инкрементальные счётчики (не обязательно, но полезно)
  const statCol = ev === 'impression' ? 'impressions' :
                  ev === 'view'       ? 'views' :
                  ev === 'like'       ? 'likes' :
                  ev === 'hide'       ? 'hides' :
                  ev === 'contact'    ? 'contacts' : null;

  if (statCol) {
    await connection.query(
      `INSERT INTO Vindeo.listing_stats (listing_id, ${statCol}, first_seen, last_event)
       VALUES (?, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE ${statCol} = ${statCol} + 1, last_event = NOW()`,
      [listingId]
    );
  }

  // 3) апдейт аффинити (EMA:  w ← 0.9*w + delta)
  const delta =
    ev === 'contact' ? 5 :
    ev === 'like'    ? 3 :
    (ev === 'view' && (dwellMs ?? 0) >= 1500) ? 1 :
    ev === 'hide'    ? -4 : 0;

  if (delta !== 0) {
    await connection.query(
      `INSERT INTO Vindeo.user_cat_affinity (user_id, category_id, w)
       SELECT ?, l.category_id, ?
       FROM Vindeo.listings l
       WHERE l.id = ?
       ON DUPLICATE KEY UPDATE
         w = 0.9*w + VALUES(w),
         updated_at = NOW()`,
      [userId, delta, listingId]
    );
  }

  return true;
}

/** Кандидаты для ленты: рядом + свежие, приоритет любимых категорий */
export async function getFeedCandidates({ userId, lat, lon, km = 15, days = 14, limit = 500 }) {
  const dlat = km / 111.0;
  const dlon = km / (111.320 * Math.cos(lat * Math.PI / 180));

  // NB: CTE без плейсхолдеров в имени; параметры передаём как массив
  const sql = `
    WITH topcats AS (
      SELECT category_id
      FROM Vindeo.user_cat_affinity
      WHERE user_id = ? AND w > 0
      ORDER BY w DESC
      LIMIT 5
    )
    SELECT
      l.id, l.category_id, l.title, l.price_cents, l.currency,
      l.lat, l.lon, l.published_at,
      EXISTS(SELECT 1 FROM Vindeo.listing_media m
             WHERE m.listing_id = l.id AND m.media_type='video' LIMIT 1) AS has_video
    FROM Vindeo.listings l
    LEFT JOIN topcats tc ON tc.category_id = l.category_id
    WHERE l.status='active'
      AND l.published_at > NOW() - INTERVAL ? DAY
      AND l.lat BETWEEN ? AND ?
      AND l.lon BETWEEN ? AND ?
    ORDER BY
      (tc.category_id IS NOT NULL) DESC,
      has_video DESC,
      l.published_at DESC
    LIMIT ?;
  `;

  const [rows] = await connection.query(sql, [
    userId,
    days,
    lat - dlat, lat + dlat,
    lon - dlon, lon + dlon,
    limit
  ]);

  return rows;
}

// вернуть пары [category_id, w] для пользователя
export async function getUserCatMap(userId) {
  const [rows] = await connection.query(
    "SELECT category_id, w FROM Vindeo.user_cat_affinity WHERE user_id = ?",
    [userId]
  );
  return rows; // дальше в роуте превращаем в Map
}

// кандидаты + базовые статсы (если listing_stats пустая — COALESCE всё покрывает)
export async function getFeedCandidatesWithStats({ lat, lon, km=15, days=14, limit=600 }) {
  const dlat = km / 111.0;
  const dlon = km / (111.320 * Math.cos(lat * Math.PI / 180));
  const sql = `
    SELECT
      l.id, l.category_id, l.seller_id, l.title, l.price_cents, l.currency,
      l.lat, l.lon, l.published_at,
      COALESCE(s.impressions,0)  AS impressions,
      COALESCE(s.views,0)        AS views,
      COALESCE(s.likes,0)        AS likes,
      COALESCE(s.hides,0)        AS hides,
      COALESCE(s.contacts,0)     AS contacts,
      COALESCE(s.has_video,0)    AS has_video,
      COALESCE(s.media_quality,0)AS media_quality,
      COALESCE(s.seller_score,.5)AS seller_score
    FROM Vindeo.listings l
    LEFT JOIN Vindeo.listing_stats s ON s.listing_id = l.id
    WHERE l.status='active'
      AND l.published_at > NOW() - INTERVAL ? DAY
      AND l.lat BETWEEN ? AND ?
      AND l.lon BETWEEN ? AND ?
    ORDER BY l.published_at DESC
    LIMIT ?`;
  const [rows] = await connection.query(sql, [
    days, lat - dlat, lat + dlat, lon - dlon, lon + dlon, limit
  ]);
  return rows;
}

function formatName(artist) {
  let artistName = htmlEntl
    .decode(artist)
    .replace(/[^\p{L}\p{N}\p{Z}]/gu, "")
    .replace(/ +/g, " ")
    .trim();

  artistName =
    artistName.length >= 55 ? artistName.substring(0, 55) : artistName;

  return artistName;
}

export { connection };