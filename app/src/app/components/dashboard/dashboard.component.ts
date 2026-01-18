import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TaskService, SocketService, NotificationService, AuthService } from '../../services';
import { Task, TaskStatus, User } from '../../models';
import { NavbarComponent } from '../navbar/navbar.component';
import { TaskModalComponent } from '../task-modal/task-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, TaskModalComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h3 class="text-sm font-medium opacity-80">Total Tasks</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().total }}</p>
        </div>
        <div class="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <h3 class="text-sm font-medium opacity-80">Pending</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().pending }}</p>
        </div>
        <div class="card bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <h3 class="text-sm font-medium opacity-80">In Progress</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().inProgress }}</p>
        </div>
        <div class="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <h3 class="text-sm font-medium opacity-80">Completed</h3>
          <p class="text-3xl font-bold">{{ taskService.stats().completed }}</p>
        </div>
      </div>

      <!-- Filters and Actions -->
      <div class="card mb-6">
        <div class="flex flex-wrap gap-4 items-center justify-between">
          <div class="flex flex-wrap gap-4">
            <select
              [(ngModel)]="statusFilter"
              (ngModelChange)="applyFilters()"
              class="input w-auto"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              [(ngModel)]="userFilter"
              (ngModelChange)="applyFilters()"
              class="input w-auto"
            >
              <option value="">All Users</option>
              @for (user of taskService.users(); track user.id) {
                <option [value]="user.id">{{ getUserDisplayName(user) }}</option>
              }
            </select>
          </div>

          <div class="flex gap-2">
            <label class="btn bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
              <svg class="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              {{ bulkTaskProcessing ? 'Importing...' : 'Import CSV' }}
              <input
                type="file"
                class="hidden"
                accept=".csv,.xlsx,.xls"
                (change)="onBulkTaskFileSelected($event)"
                [disabled]="bulkTaskProcessing"
              />
            </label>
            @if (taskService.tasks().length > 0) {
              <button (click)="exportToCSV()" class="btn bg-green-600 text-white hover:bg-green-700">
                <svg class="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Export CSV
              </button>
            }
            <button (click)="openModal()" class="btn btn-primary">
              + New Task
            </button>
          </div>
        </div>
      </div>

      <!-- Tasks Table -->
      <div class="card overflow-hidden">
        @if (taskService.loading()) {
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p class="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        } @else if (taskService.tasks().length === 0) {
          <div class="text-center py-8 text-gray-500">
            No tasks found. Create your first task!
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (task of taskService.tasks(); track task.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                      <div class="font-medium text-gray-900">{{ task.title }}</div>
                      @if (task.description) {
                        <div class="text-sm text-gray-500 truncate max-w-xs">{{ task.description }}</div>
                      }
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusBadgeClass(task.status)">
                        {{ task.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">
                      {{ getAssigneeName(task) }}
                    </td>
                    <td class="px-6 py-4 text-sm" [class.text-red-600]="isOverdue(task)">
                      {{ task.due_date ? (task.due_date | date:'mediumDate') : '-' }}
                      @if (isOverdue(task)) {
                        <span class="text-xs">(Overdue)</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-right">
                      <!-- Action Dropdown -->
                      <div class="relative inline-block text-left">
                        <button
                          (click)="toggleTaskMenu(task.id)"
                          class="p-2 rounded-full hover:bg-gray-100"
                        >
                          <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                          </svg>
                        </button>

                        @if (openTaskMenuId === task.id) {
                          <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            <button
                              (click)="viewTaskDetails(task); closeTaskMenu()"
                              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                              </svg>
                              View Details
                            </button>
                            <button
                              (click)="openModal(task); closeTaskMenu()"
                              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                              Edit
                            </button>
                            <div class="border-t border-gray-100 my-1"></div>
                            <button
                              (click)="deleteTask(task); closeTaskMenu()"
                              class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                              Delete
                            </button>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (taskService.pagination().totalPages > 1) {
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div class="text-sm text-gray-700">
                Showing {{ ((taskService.pagination().page - 1) * taskService.pagination().limit) + 1 }}
                to {{ Math.min(taskService.pagination().page * taskService.pagination().limit, taskService.pagination().total) }}
                of {{ taskService.pagination().total }} tasks
              </div>
              <div class="flex items-center space-x-2">
                <button
                  (click)="goToPage(taskService.pagination().page - 1)"
                  [disabled]="!taskService.pagination().hasPrev"
                  class="px-3 py-1 rounded border text-sm font-medium transition-colors"
                  [class.bg-white]="taskService.pagination().hasPrev"
                  [class.text-gray-700]="taskService.pagination().hasPrev"
                  [class.hover:bg-gray-100]="taskService.pagination().hasPrev"
                  [class.bg-gray-100]="!taskService.pagination().hasPrev"
                  [class.text-gray-400]="!taskService.pagination().hasPrev"
                  [class.cursor-not-allowed]="!taskService.pagination().hasPrev"
                >
                  Previous
                </button>
                <span class="px-3 py-1 text-sm text-gray-600">
                  Page {{ taskService.pagination().page }} of {{ taskService.pagination().totalPages }}
                </span>
                <button
                  (click)="goToPage(taskService.pagination().page + 1)"
                  [disabled]="!taskService.pagination().hasNext"
                  class="px-3 py-1 rounded border text-sm font-medium transition-colors"
                  [class.bg-white]="taskService.pagination().hasNext"
                  [class.text-gray-700]="taskService.pagination().hasNext"
                  [class.hover:bg-gray-100]="taskService.pagination().hasNext"
                  [class.bg-gray-100]="!taskService.pagination().hasNext"
                  [class.text-gray-400]="!taskService.pagination().hasNext"
                  [class.cursor-not-allowed]="!taskService.pagination().hasNext"
                >
                  Next
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Backdrop for closing dropdown -->
    @if (openTaskMenuId !== null) {
      <div (click)="closeTaskMenu()" class="fixed inset-0 z-40"></div>
    }

    <!-- Task Details Modal -->
    @if (showDetailsModal && viewTask) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h2 class="text-2xl font-bold text-gray-900">{{ viewTask.title }}</h2>
                <span [class]="getStatusBadgeClass(viewTask.status)" class="mt-2 inline-block">
                  {{ viewTask.status }}
                </span>
              </div>
              <button (click)="closeDetailsModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-medium text-gray-500 uppercase">Description</h3>
                <p class="mt-1 text-gray-900">{{ viewTask.description || 'No description provided' }}</p>
              </div>

              <hr class="border-gray-200" />

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Due Date</h3>
                  <p class="mt-1 text-gray-900" [class.text-red-600]="isOverdue(viewTask)">
                    {{ viewTask.due_date ? (viewTask.due_date | date:'fullDate') : 'No due date' }}
                    @if (isOverdue(viewTask)) {
                      <span class="text-xs ml-1">(Overdue)</span>
                    }
                  </p>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Created</h3>
                  <p class="mt-1 text-gray-900">{{ viewTask.createdAt | date:'medium' }}</p>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Assigned To</h3>
                  <div class="mt-1">
                    @if (viewTask.assignee) {
                      <p class="text-gray-900 font-medium">{{ getAssigneeName(viewTask) }}</p>
                      <p class="text-sm text-gray-500">{{ viewTask.assignee.email }}</p>
                    } @else {
                      <p class="text-gray-500">Unassigned</p>
                    }
                  </div>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Created By</h3>
                  <div class="mt-1">
                    @if (viewTask.creator) {
                      <p class="text-gray-900 font-medium">{{ getCreatorName(viewTask) }}</p>
                      <p class="text-sm text-gray-500">{{ viewTask.creator.email }}</p>
                    } @else {
                      <p class="text-gray-500">Unknown</p>
                    }
                  </div>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Last Updated</h3>
                  <p class="mt-1 text-gray-900">{{ viewTask.updatedAt | date:'medium' }}</p>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 uppercase">Task ID</h3>
                  <p class="mt-1 text-gray-900">#{{ viewTask.id }}</p>
                </div>
              </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
              <button
                (click)="closeDetailsModal()"
                class="btn bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                (click)="closeDetailsModal(); openModal(viewTask)"
                class="btn btn-primary"
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Task Modal -->
    @if (showModal) {
      <app-task-modal
        [task]="selectedTask"
        [users]="taskService.users()"
        (close)="closeModal()"
        (save)="saveTask($event)"
      ></app-task-modal>
    }
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  Math = Math; // For template access
  showModal = false;
  showDetailsModal = false;
  selectedTask: Task | null = null;
  viewTask: Task | null = null;
  statusFilter = '';
  userFilter = '';
  openTaskMenuId: number | null = null;
  currentPage = 1;
  pageSize = 10;
  bulkTaskProcessing = false;

  private subscriptions: Subscription[] = [];

  constructor(
    public taskService: TaskService,
    private socketService: SocketService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupSocketListeners();
    this.socketService.connect();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.disconnect();
  }

  loadData(): void {
    this.taskService.loadTasks(undefined, undefined, this.currentPage, this.pageSize).subscribe();
    this.taskService.loadStats().subscribe();
    this.taskService.loadUsers().subscribe();
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page on filter change
    const status = this.statusFilter as TaskStatus | undefined;
    const userId = this.userFilter ? parseInt(this.userFilter) : undefined;
    this.taskService.loadTasks(status || undefined, userId, this.currentPage, this.pageSize).subscribe();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    const status = this.statusFilter as TaskStatus | undefined;
    const userId = this.userFilter ? parseInt(this.userFilter) : undefined;
    this.taskService.loadTasks(status || undefined, userId, this.currentPage, this.pageSize).subscribe();
  }

  toggleTaskMenu(taskId: number): void {
    this.openTaskMenuId = this.openTaskMenuId === taskId ? null : taskId;
  }

  closeTaskMenu(): void {
    this.openTaskMenuId = null;
  }

  openModal(task?: Task): void {
    this.selectedTask = task || null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedTask = null;
  }

  viewTaskDetails(task: Task): void {
    this.viewTask = task;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.viewTask = null;
  }

  saveTask(data: any): void {
    if (this.selectedTask) {
      this.taskService.updateTask(this.selectedTask.id, data).subscribe({
        next: () => {
          this.notificationService.success('Task updated successfully');
          this.closeModal();
          this.taskService.loadStats().subscribe();
        },
        error: (err) => {
          this.notificationService.error(err.error?.error || 'Failed to update task');
        }
      });
    } else {
      this.taskService.createTask(data).subscribe({
        next: () => {
          this.notificationService.success('Task created successfully');
          this.closeModal();
          this.taskService.loadStats().subscribe();
        },
        error: (err) => {
          this.notificationService.error(err.error?.error || 'Failed to create task');
        }
      });
    }
  }

  deleteTask(task: Task): void {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskService.deleteTask(task.id).subscribe({
        next: () => {
          this.notificationService.success('Task deleted successfully');
          this.taskService.loadStats().subscribe();
        },
        error: (err) => {
          this.notificationService.error(err.error?.error || 'Failed to delete task');
        }
      });
    }
  }

  exportToCSV(): void {
    const tasks = this.taskService.tasks();
    if (tasks.length === 0) return;

    const headers = ['ID', 'Title', 'Description', 'Status', 'Assigned To', 'Due Date', 'Created By', 'Created At', 'Updated At'];
    const rows = tasks.map(task => [
      task.id,
      `"${task.title.replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      task.status,
      this.getAssigneeName(task),
      task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
      this.getCreatorName(task),
      new Date(task.createdAt).toLocaleString(),
      new Date(task.updatedAt).toLocaleString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.notificationService.success('Tasks exported successfully');
  }

  onBulkTaskFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.bulkTaskProcessing = true;

    this.taskService.bulkCreateTasks(file).subscribe({
      next: (response) => {
        const successCount = response.results.success.length;
        const failedCount = response.results.failed.length;

        if (successCount > 0 && failedCount === 0) {
          this.notificationService.success(`Successfully created ${successCount} tasks`);
        } else if (successCount > 0 && failedCount > 0) {
          this.notificationService.success(`Created ${successCount} tasks. ${failedCount} failed.`);
        } else if (failedCount > 0) {
          this.notificationService.error(`Failed to create tasks: ${response.results.failed.map(f => f.reason).join(', ')}`);
        }

        // Reload tasks and stats
        this.loadData();
        this.bulkTaskProcessing = false;
        input.value = ''; // Reset file input
      },
      error: (err) => {
        this.notificationService.error(err.error?.error || 'Failed to import tasks');
        this.bulkTaskProcessing = false;
        input.value = ''; // Reset file input
      }
    });
  }

  getStatusBadgeClass(status: TaskStatus): string {
    const base = 'badge';
    switch (status) {
      case 'Pending':
        return `${base} badge-pending`;
      case 'In Progress':
        return `${base} badge-in-progress`;
      case 'Completed':
        return `${base} badge-completed`;
      default:
        return base;
    }
  }

  isOverdue(task: Task): boolean {
    if (!task.due_date || task.status === 'Completed') return false;
    return new Date(task.due_date) < new Date();
  }

  getUserDisplayName(user: User): string {
    return user.full_name || `${user.first_name} ${user.last_name}`;
  }

  getAssigneeName(task: Task): string {
    if (!task.assignee) return 'Unassigned';
    return task.assignee.full_name || `${task.assignee.first_name} ${task.assignee.last_name}`;
  }

  getCreatorName(task: Task): string {
    if (!task.creator) return '';
    return task.creator.full_name || `${task.creator.first_name} ${task.creator.last_name}`;
  }

  private setupSocketListeners(): void {
    const notificationSub = this.socketService.notifications$.subscribe(notification => {
      this.notificationService.info(notification.message);
    });

    const taskUpdateSub = this.socketService.taskUpdates$.subscribe(update => {
      if (update.action === 'created' || update.action === 'updated') {
        if (update.task) {
          this.taskService.updateTaskInList(update.task);
        }
      } else if (update.action === 'deleted' && update.taskId) {
        this.taskService.removeTaskFromList(update.taskId);
      }
      this.taskService.loadStats().subscribe();
    });

    this.subscriptions.push(notificationSub, taskUpdateSub);
  }
}
