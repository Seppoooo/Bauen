package test;
public class Sched implements org.bukkit.scheduler.BukkitScheduler {
    public static Runnable task;
    public org.bukkit.scheduler.BukkitTask runTaskTimer(org.bukkit.plugin.Plugin p, Runnable r, long d, long per) { task = r; return () -> task = null; }
}
