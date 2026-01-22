import Scheduler from '../components/Scheduler/Scheduler';

export default function TaskScheduler() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Task Scheduler</h1>
        <p className="text-gray-500 mt-1">View all project tasks in a calendar view</p>
      </div>

      <Scheduler />
    </div>
  );
}
