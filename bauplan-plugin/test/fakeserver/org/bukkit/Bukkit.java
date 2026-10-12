package org.bukkit;
import java.util.*;
public final class Bukkit {
    public static final List<org.bukkit.entity.Player> SPIELER = new ArrayList<>();
    public static final org.bukkit.scheduler.BukkitScheduler SCHED = new test.Sched();
    public static java.util.Collection<? extends org.bukkit.entity.Player> getOnlinePlayers() { return SPIELER; }
    public static org.bukkit.scheduler.BukkitScheduler getScheduler() { return SCHED; }
}
