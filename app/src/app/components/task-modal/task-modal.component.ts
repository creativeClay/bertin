import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task, TaskStatus, User, CreateTaskRequest, UpdateTaskRequest } from '../../models';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div class="flex justify-between items-center px-6 py-4 border-b">
          <h3 class="text-lg font-semibold text-gray-800">
            {{ task ? 'Edit Task' : 'Create Task' }}
          </h3>
          <button (click)="close.emit()" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6">
          <div class="mb-4">
            <label class="label" for="title">Title</label>
            <input
              type="text"
              id="title"
              formControlName="title"
              class="input"
              placeholder="Task title"
            />
            @if (form.get('title')?.touched && form.get('title')?.invalid) {
              <p class="text-red-500 text-sm mt-1">Title is required</p>
            }
          </div>

          <div class="mb-4">
            <label class="label" for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              class="input min-h-[100px]"
              placeholder="Task description"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="label" for="status">Status</label>
              <select id="status" formControlName="status" class="input">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label class="label" for="due_date">Due Date</label>
              <input
                type="date"
                id="due_date"
                formControlName="due_date"
                class="input"
              />
            </div>
          </div>

          <div class="mb-6">
            <label class="label" for="assigned_to">Assign To</label>
            <select id="assigned_to" formControlName="assigned_to" class="input">
              <option [ngValue]="null">Unassigned</option>
              @for (user of users; track user.id) {
                <option [ngValue]="user.id">{{ user.username }}</option>
              }
            </select>
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" (click)="close.emit()" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" [disabled]="form.invalid || loading" class="btn btn-primary">
              {{ loading ? 'Saving...' : (task ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class TaskModalComponent implements OnInit {
  @Input() task: Task | null = null;
  @Input() users: User[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<CreateTaskRequest | UpdateTaskRequest>();

  form!: FormGroup;
  loading = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: [this.task?.title || '', Validators.required],
      description: [this.task?.description || ''],
      status: [this.task?.status || 'Pending'],
      due_date: [this.task?.due_date ? this.formatDate(this.task.due_date) : ''],
      assigned_to: [this.task?.assigned_to || null]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const data = { ...this.form.value };
    if (!data.due_date) delete data.due_date;
    if (data.assigned_to === null) delete data.assigned_to;

    this.save.emit(data);
  }

  private formatDate(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }
}
