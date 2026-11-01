export const schema = `
CREATE TABLE locations (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('gym','home')));
CREATE TABLE exercises (id TEXT PRIMARY KEY, name TEXT NOT NULL, measurement_mode TEXT NOT NULL);
CREATE TABLE equipment_variations (
  id TEXT PRIMARY KEY, exercise_id TEXT NOT NULL REFERENCES exercises(id),
  location_id TEXT NOT NULL REFERENCES locations(id), name TEXT NOT NULL,
  measurement_mode TEXT NOT NULL, load_convention TEXT NOT NULL, load_dimension TEXT NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, activity_date TEXT NOT NULL, timezone TEXT NOT NULL,
  started_at TEXT NOT NULL, ended_at TEXT NOT NULL,
  location_id TEXT NOT NULL REFERENCES locations(id), location_name_snapshot TEXT NOT NULL,
  location_kind_snapshot TEXT NOT NULL, session_type_name_snapshot TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status = 'completed')
);
CREATE TABLE session_exercises (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id), equipment_variation_id TEXT NOT NULL REFERENCES equipment_variations(id),
  position INTEGER NOT NULL, exercise_name_snapshot TEXT NOT NULL, equipment_name_snapshot TEXT NOT NULL,
  bodyweight INTEGER NOT NULL CHECK(bodyweight IN (0,1)), load_unit TEXT NOT NULL, load_convention TEXT NOT NULL,
  UNIQUE(session_id, position)
);
CREATE TABLE sets (
  id TEXT PRIMARY KEY, session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, load_value REAL CHECK(load_value >= 0), reps INTEGER NOT NULL CHECK(reps > 0),
  UNIQUE(session_exercise_id, position)
);
CREATE TABLE draft_checkpoint (singleton INTEGER PRIMARY KEY CHECK(singleton=1), session_id TEXT NOT NULL, payload TEXT NOT NULL);
CREATE INDEX sessions_by_date ON sessions(activity_date);
CREATE INDEX session_equipment ON session_exercises(equipment_variation_id);
INSERT INTO locations(id,name,kind) VALUES ('home','Home','home');
PRAGMA user_version=1;
`;
