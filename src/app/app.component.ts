import { Component } from '@angular/core';
import { Task } from './task/task';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { TaskDialogComponent } from './task-dialog/task-dialog.component';
import { TaskDialogResult } from './task-dialog/task-dialog.component';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject<Task[]>([]);
  collection.valueChanges({ idField: 'id'}).subscribe((val: Task[]) => {
    subject.next(val);
  });
  return subject;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  public todo: Observable<Task[]>;
  public inProgress: Observable<Task[]>;
  public done: Observable<Task[]>;

  constructor(private dialog: MatDialog, private store: AngularFirestore) {
    this.todo = getObservable(this.store.collection('todo')) as Observable<Task[]>;
    this.inProgress = getObservable(this.store.collection('inProgress')) as Observable<Task[]>;
    this.done = getObservable(this.store.collection('done')) as Observable<Task[]>;

  }

  public newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, { width: '270px', data: { task: {} } });
    dialogRef.afterClosed().subscribe((result: TaskDialogResult | undefined) => {
      if (!result) return;
      this.store.collection('todo').add(result.task);
    });
  }

  public editTask(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, { width: '270px', data: { task, enableDelete: true } });
    dialogRef.afterClosed().subscribe(( result: TaskDialogResult | undefined ) => {
      if (!result) return;
      if (result.delete) {
        this.store.collection(list).doc(task.id).delete();
      } else {
        this.store.collection(list).doc(task.id).update(task);
      }
    });
  }

  public drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) return;
    const item = event.previousContainer.data[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      const promise = Promise.all([ this.store.collection(event.previousContainer.id).doc(item.id).delete(), this.store.collection(event.container.id).add(item)]);
      return promise;
    })
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
  }

}
