// ── TOME SNAPSHOT: tomb1snapshot ─────────────────────────────────────────────
// Captured from game.js TOME_DEFS at commit tomb1snapshot.
// To restore: copy the array below back over TOME_DEFS in game.js.
//
// Balance notes at time of snapshot:
//   - L1 felt slightly too hard
//   - Damage tome: +5% per stack
//   - Snowball/Bullet: +20% per stack
//   - Attack speed: +8% per stack
//   - HP Tome: +25 flat

const TOME_DEFS_tomb1snapshot = [
  { id:'damage',       desc:'+5% damage (all weapons)',                   apply: 's.damage *= 1.05' },
  { id:'snowball_dmg', desc:'+20% snowball/bullet damage',                apply: 's.snowballDmgMult = (s.snowballDmgMult||1) * 1.2' },
  { id:'magic_dmg',    desc:'+10% magic damage',                          apply: 's.magicDmgMult = (s.magicDmgMult||1) * 1.1' },
  { id:'precision',    desc:'+5% critical hit chance',                    apply: 's.critChance = Math.min(0.9, s.critChance+0.05)' },
  { id:'cooldown',     desc:'-8% spell cooldown',                         apply: 's.weaponCooldown *= 0.92' },
  { id:'atkspeed',     desc:'+8% snowball attack speed',                  apply: 's.attackRate *= 0.92' },
  { id:'quantity',     desc:'+1 snowball (50% less each stack)',           apply: 'see game.js multi-line' },
  { id:'size',         desc:'+20% projectile size',                       apply: 's.projSize *= 1.2' },
  { id:'projspeed',    desc:'+15% projectile speed',                      apply: 's.projSpeed *= 1.15' },
  { id:'shield',       desc:'First: +1 shield. Extra: +0.3s iframes',     apply: 'see game.js' },
  { id:'evasion',      desc:'+10% dodge chance',                          apply: 's.evasion = Math.min(0.7, s.evasion+0.1)' },
  { id:'bloody',       desc:'+2% chance to heal 1 HP on hit',             apply: 's.bloodHeal = Math.min(1, s.bloodHeal+0.02)' },
  { id:'hp',           desc:'+25 max HP',                                 apply: 'playerState.maxHp+=25; playerState.hp+=25' },
  { id:'phrico',       desc:'+1% movement speed',                         apply: 's.moveSpeed *= 1.01' },
  { id:'attraction',   desc:'+1 pickup radius',                           apply: 's.pickupRadius += 1' },
  { id:'knockback',    desc:'+0.75 knockback on hit',                     apply: 's.knockback += 0.75' },
  { id:'cursed',       desc:'+25% spawn rate, +30% enemy HP',             apply: 's.cursed += 1' },
  { id:'chaos',        desc:'Random tome effect',                         apply: 'chaos()' },
  { id:'hasper',       desc:'Boomerang snowball — 60% out, 40% return',   apply: 's.boomerang = true' },
  { id:'shaggy',       desc:'Absorb 1 hit, +0.2 damage per stack',       apply: 'see game.js multi-line' },
  { id:'gust_of_wind', desc:'Perfect jumps drop a gust, 10 dmg',         apply: 's.gustOfWind += 1' },
];
