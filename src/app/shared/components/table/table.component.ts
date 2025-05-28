import {
  Component,
  Input,
  ContentChild,
  TemplateRef,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ColumnDef {
  key: string; // Corresponds to a key in the data object
  header: string; // Display name for the column header
  cellRenderer?: TemplateRef<unknown>; // Optional custom template for cell rendering
  headerClass?: string; // Optional classes for header th
  cellClass?: string; // Optional classes for data td
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent<T> implements OnInit, OnChanges {
  @Input() columns: ColumnDef[] = [];
  @Input() data: T[] = [];
  @Input() class = ''; // Allow passing additional Tailwind classes for the table container
  @Input() tableClass = '';
  @Input() tableContainerClass = '';
  @Input() enableRowClick = false;
  @Output() rowClicked = new EventEmitter<T>();

  displayedColumns: string[] = [];

  // Allows passing a template for a specific column cell by its key
  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<unknown>;
  // This is a generic cell template. For specific column templates, users can pass them via ColumnDef.cellRenderer

  ngOnInit(): void {
    this.updateDisplayedColumns();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.updateDisplayedColumns();
    }
  }

  private updateDisplayedColumns(): void {
    this.displayedColumns = this.columns.map((c) => c.key);
  }

  // Helper to get value from data object, including nested keys
  getColumnValue(item: T, columnKey: string): unknown {
    if (!item || typeof columnKey !== 'string') return '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (item as any)[columnKey];
  }

  onRowClick(item: T): void {
    if (this.enableRowClick) {
      this.rowClicked.emit(item);
    }
  }
}
