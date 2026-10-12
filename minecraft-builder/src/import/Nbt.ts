/** Minimaler NBT-Leser (Java Edition, Big Endian) für Schematic-Dateien. */

export type NbtValue = number | bigint | string | NbtValue[] | { [key: string]: NbtValue } | Int8Array | Int32Array | BigInt64Array;
export type NbtCompound = { [key: string]: NbtValue };

export function readNbt(buffer: ArrayBuffer): NbtCompound {
  const view = new DataView(buffer);
  const dec = new TextDecoder();
  let o = 0;
  const u8 = () => view.getUint8(o++);
  const i16 = () => { const v = view.getInt16(o); o += 2; return v; };
  const i32 = () => { const v = view.getInt32(o); o += 4; return v; };
  const i64 = () => { const v = view.getBigInt64(o); o += 8; return v; };
  const str = () => { const n = view.getUint16(o); o += 2; const s = dec.decode(new Uint8Array(buffer, o, n)); o += n; return s; };

  function wert(typ: number): NbtValue {
    switch (typ) {
      case 1: return view.getInt8(o++);
      case 2: return i16();
      case 3: return i32();
      case 4: return i64();
      case 5: { const v = view.getFloat32(o); o += 4; return v; }
      case 6: { const v = view.getFloat64(o); o += 8; return v; }
      case 7: { const n = i32(); const a = new Int8Array(buffer.slice(o, o + n)); o += n; return a; }
      case 8: return str();
      case 9: { const t = u8(), n = i32(); const a: NbtValue[] = []; for (let i = 0; i < n; i++) a.push(wert(t)); return a; }
      case 10: {
        const c: NbtCompound = {};
        for (;;) { const t = u8(); if (t === 0) return c; const name = str(); c[name] = wert(t); }
      }
      case 11: { const n = i32(); const a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = i32(); return a; }
      case 12: { const n = i32(); const a = new BigInt64Array(n); for (let i = 0; i < n; i++) a[i] = i64(); return a; }
      default: throw new Error('Unbekannter NBT-Typ ' + typ);
    }
  }
  if (u8() !== 10) throw new Error('Keine gültige NBT-Datei.');
  str();
  return wert(10) as NbtCompound;
}

/** Entpackt gzip (Schematic-Dateien sind gzip-komprimiert) mit der Browser-API. */
export async function gunzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return data;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).arrayBuffer();
}
