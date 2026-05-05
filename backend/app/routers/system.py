"""System info endpoint — CPU, RAM, disk for the dashboard resource monitor."""
import psutil
from fastapi import APIRouter

router = APIRouter()


@router.get("/info")
async def system_info():
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    cpu_per_core = psutil.cpu_percent(percpu=True)

    return {
        "cpu": {
            "percent": psutil.cpu_percent(interval=None),
            "per_core": cpu_per_core,
            "count": psutil.cpu_count(),
        },
        "memory": {
            "total_gb": round(vm.total / 1e9, 2),
            "used_gb": round(vm.used / 1e9, 2),
            "percent": vm.percent,
        },
        "disk": {
            "total_gb": round(disk.total / 1e9, 2),
            "used_gb": round(disk.used / 1e9, 2),
            "percent": disk.percent,
        },
    }
