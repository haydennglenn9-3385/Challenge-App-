-- Atomically toggle a user's emoji reaction on an activity_feed row.
-- Uses SELECT … FOR UPDATE so concurrent reactions don't overwrite each other.
--
-- Run this once in the Supabase SQL Editor (or via supabase db push):
--   Project → SQL Editor → paste → Run
--
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_feed_id uuid,
  p_emoji   text,
  p_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reactions   jsonb;
  v_emoji_users jsonb;
BEGIN
  -- Lock the row so only one writer wins at a time
  SELECT reactions INTO v_reactions
  FROM activity_feed
  WHERE id = p_feed_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feed item not found: %', p_feed_id;
  END IF;

  v_reactions   := COALESCE(v_reactions, '{}'::jsonb);
  v_emoji_users := COALESCE(v_reactions->p_emoji, '[]'::jsonb);

  IF v_emoji_users @> to_jsonb(p_user_id) THEN
    -- Remove the user from this emoji's array
    SELECT COALESCE(jsonb_agg(val), '[]'::jsonb)
    INTO v_emoji_users
    FROM jsonb_array_elements_text(v_emoji_users) val
    WHERE val <> p_user_id;
  ELSE
    -- Add the user to this emoji's array
    v_emoji_users := v_emoji_users || to_jsonb(p_user_id);
  END IF;

  UPDATE activity_feed
  SET reactions = jsonb_set(v_reactions, ARRAY[p_emoji], v_emoji_users)
  WHERE id = p_feed_id
  RETURNING reactions INTO v_reactions;

  RETURN v_reactions;
END;
$$;
