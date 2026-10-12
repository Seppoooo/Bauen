package org.bukkit;
public class Location {
    public World w; public double x, y, z; public float yaw, pitch;
    public Location(World w, double x, double y, double z, float yaw, float pitch) { this.w = w; this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.pitch = pitch; }
    public World getWorld() { return w; }
    public double getX() { return x; } public double getY() { return y; } public double getZ() { return z; }
    public float getYaw() { return yaw; } public float getPitch() { return pitch; }
    public int getBlockX() { return (int) Math.floor(x); } public int getBlockY() { return (int) Math.floor(y); } public int getBlockZ() { return (int) Math.floor(z); }
}
