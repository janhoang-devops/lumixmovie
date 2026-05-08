import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PremiumMoviesComponent } from './premium-movies.component';

describe('PremiumMoviesComponent', () => {
  let component: PremiumMoviesComponent;
  let fixture: ComponentFixture<PremiumMoviesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PremiumMoviesComponent ]
    }).compileComponents();
    fixture = TestBed.createComponent(PremiumMoviesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
